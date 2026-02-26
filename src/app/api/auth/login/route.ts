import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (password === process.env.PASSWORD) {
      const response = NextResponse.json({ success: true });
      response.cookies.set('isAuthenticated', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
      });
      return response;
    } else {
      return NextResponse.json({ success: false, message: 'Incorrect password' }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ success: false, message: 'An error occurred' }, { status: 500 });
  }
}