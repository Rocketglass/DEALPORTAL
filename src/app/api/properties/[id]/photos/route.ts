/**
 * POST /api/properties/[id]/photos
 *   Upload one or more photos to Supabase Storage (property-photos bucket).
 *   Accepts multipart/form-data with field name "files".
 *   Updates property.photos array.
 *   Requires broker/admin auth.
 *
 * DELETE /api/properties/[id]/photos
 *   Remove a photo from storage and the property record.
 *   Accepts JSON body: { url: string }
 *   Requires broker/admin auth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const BUCKET = 'property-photos';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Magic-byte signatures for image validation.
 * Matches the pattern from @/lib/security/sanitize.ts, extended with WebP.
 */
const IMAGE_SIGNATURES: Array<{ mime: string; bytes: number[] }> = [
  // PNG: 0x89 P N G
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  // JPEG: 0xFF 0xD8 0xFF
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  // WebP: R I F F ... W E B P (bytes 0-3 = RIFF, bytes 8-11 = WEBP)
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] },
];

const WEBP_MARKER = [0x57, 0x45, 0x42, 0x50]; // "WEBP" at offset 8

/**
 * Validate that a file's magic bytes match its declared MIME type.
 */
async function validateImageMagicBytes(file: File): Promise<{ valid: boolean; error?: string }> {
  try {
    const headerBytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const signature = IMAGE_SIGNATURES.find((sig) => sig.mime === file.type);

    if (!signature) {
      return { valid: false, error: `No signature check available for type ${file.type}` };
    }

    const matchesPrefix = signature.bytes.every((byte, i) => headerBytes[i] === byte);
    if (!matchesPrefix) {
      return { valid: false, error: 'File content does not match its declared type. The file may be corrupted or disguised' };
    }

    // WebP requires an additional check: bytes 8-11 must be "WEBP"
    if (file.type === 'image/webp') {
      const matchesWebp = WEBP_MARKER.every((byte, i) => headerBytes[8 + i] === byte);
      if (!matchesWebp) {
        return { valid: false, error: 'File content does not match its declared type. The file may be corrupted or disguised' };
      }
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Could not read file content for validation' };
  }
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const user = await requireBrokerOrAdminForApi();
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'Missing property id' }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify property exists
    const { data: property, error: fetchError } = await supabase
      .from('properties')
      .select('id, photos')
      .eq('id', id)
      .single();

    if (fetchError || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Validate all files before uploading (type, size, and magic bytes)
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `Invalid file type: ${file.type}. Allowed: JPG, PNG, WebP` },
          { status: 400 },
        );
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds 5MB limit` },
          { status: 400 },
        );
      }
      if (file.size === 0) {
        return NextResponse.json(
          { error: `File "${file.name}" is empty` },
          { status: 400 },
        );
      }

      // Magic-byte validation: verify file content matches declared MIME type
      const magicCheck = await validateImageMagicBytes(file);
      if (!magicCheck.valid) {
        return NextResponse.json(
          { error: `File "${file.name}": ${magicCheck.error}` },
          { status: 400 },
        );
      }
    }

    const newUrls: string[] = [];
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    for (const file of files) {
      const timestamp = Date.now();
      // Sanitize filename: remove special chars, keep extension
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${id}/${timestamp}-${safeName}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error(`[POST /api/properties/${id}/photos] Upload error:`, uploadError);
        return NextResponse.json(
          { error: `Upload failed for "${file.name}": ${uploadError.message}` },
          { status: 500 },
        );
      }

      // Build public URL
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${storagePath}`;
      newUrls.push(publicUrl);
    }

    // Update property record — append new URLs to existing
    const existingUrls: string[] = Array.isArray(property.photos) ? property.photos : [];
    const updatedUrls = [...existingUrls, ...newUrls];

    const { error: updateError } = await supabase
      .from('properties')
      .update({ photos: updatedUrls })
      .eq('id', id);

    if (updateError) {
      console.error(`[POST /api/properties/${id}/photos] DB update error:`, updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Audit log (non-fatal)
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'property_photos_uploaded',
      entity_type: 'property',
      entity_id: id,
      new_value: { added_urls: newUrls } as Record<string, unknown>,
    });

    return NextResponse.json({ photos: updatedUrls }, { status: 200 });
  } catch (error) {
    console.error('[POST /api/properties/[id]/photos] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.startsWith('Unauthorized') || message.startsWith('Forbidden') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const user = await requireBrokerOrAdminForApi();
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'Missing property id' }, { status: 400 });
    }

    const body = await request.json();
    const { url } = body as { url?: string };

    if (!url) {
      return NextResponse.json({ error: 'Missing url in request body' }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify property exists
    const { data: property, error: fetchError } = await supabase
      .from('properties')
      .select('id, photos')
      .eq('id', id)
      .single();

    if (fetchError || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Extract storage path from URL
    // URL format: {supabaseUrl}/storage/v1/object/public/property-photos/{property_id}/{filename}
    const bucketPrefix = `/storage/v1/object/public/${BUCKET}/`;
    const pathIndex = url.indexOf(bucketPrefix);
    if (pathIndex === -1) {
      return NextResponse.json({ error: 'Invalid photo URL' }, { status: 400 });
    }
    const storagePath = url.substring(pathIndex + bucketPrefix.length);

    // Remove from storage
    const { error: deleteError } = await supabase.storage
      .from(BUCKET)
      .remove([storagePath]);

    if (deleteError) {
      console.error(`[DELETE /api/properties/${id}/photos] Storage delete error:`, deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Update property record — remove the URL
    const existingUrls: string[] = Array.isArray(property.photos) ? property.photos : [];
    const updatedUrls = existingUrls.filter((u) => u !== url);

    const { error: updateError } = await supabase
      .from('properties')
      .update({ photos: updatedUrls })
      .eq('id', id);

    if (updateError) {
      console.error(`[DELETE /api/properties/${id}/photos] DB update error:`, updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Audit log (non-fatal)
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'property_photo_deleted',
      entity_type: 'property',
      entity_id: id,
      old_value: { removed_url: url } as Record<string, unknown>,
    });

    return NextResponse.json({ photos: updatedUrls }, { status: 200 });
  } catch (error) {
    console.error('[DELETE /api/properties/[id]/photos] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.startsWith('Unauthorized') || message.startsWith('Forbidden') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
