import { NextResponse } from 'next/server';

export function success<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function error(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export function badRequest(message: string) {
  return error(message, 400);
}

export function notFound(message = 'Not found') {
  return error(message, 404);
}

export function conflict(message: string) {
  return error(message, 409);
}

export function unauthorized(message = 'Unauthorized') {
  return error(message, 401);
}
