import { SignJWT } from 'jose';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { password, redirect_uri } = await req.json();

    if (password === process.env.PASSWORD) {
      // Create the JWT
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const alg = 'HS256';
      const token = await new SignJWT({ 'urn:example:claim': true })
        .setProtectedHeader({ alg })
        .setIssuedAt()
        .sign(secret);

      const response = NextResponse.json({ success: true, redirect_uri: redirect_uri || '/' });
      response.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      });
      return response;
    } else {
      const response = NextResponse.json({ success: false, message: 'Incorrect password' }, { status: 401 });
      response.cookies.delete('token');
      return response;
    }
  } catch (error) {
    console.error('Login API error:', error);
    const response = NextResponse.json({ success: false, message: 'An error occurred' }, { status: 500 });
    response.cookies.delete('token');
    return response;
  }
}