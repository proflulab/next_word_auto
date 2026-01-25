/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2024-11-06 18:35:00
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-08-16 03:33:55
 * @FilePath: /next_word_auto/src/middleware.ts
 * @Description: 路由中间件，处理密码验证
 * 
 * Copyright (c) 2024 by ${git_name_email}, All Rights Reserved. 
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

async function verifyJWT(token: string, secret: Uint8Array) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const password = process.env.PASSWORD;

  if (!password) {
    return NextResponse.next();
  }

  const publicPaths = ['/', '/password'];
  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get('token')?.value;
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);

  if (!token) {
    const url = new URL('/password', request.url);
    url.searchParams.set('redirect_uri', pathname);
    return NextResponse.redirect(url);
  }

  const payload = await verifyJWT(token, secret);

  if (!payload) {
    // If token is invalid, delete the cookie and redirect
    const url = new URL('/password', request.url);
    url.searchParams.set('redirect_uri', pathname);
    const response = NextResponse.redirect(url);
    response.cookies.delete('token');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};