import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma
const prisma = new PrismaClient();

// 1. Keep your existing OPTIONS function right here...
export async function OPTIONS() {
  return NextResponse.json({}, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// 2. Updated POST function to check the database
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;
    
    // Search the database for a user matching the submitted name
    const user = await prisma.user.findFirst({
      where: {
        name: username, // Matching Tariq's 'username' to your DB's 'name'
      },
    });

    // If no user is found with that name
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" }, 
        { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // If the user is found, but the password doesn't match
    // Note: For a production app, you would use bcrypt to hash/compare passwords, but plain text is fine for this MVP test
    if (user.password !== password) {
      return NextResponse.json(
        { success: false, error: "Incorrect password" }, 
        { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }
    
    // If name and password both match
    return NextResponse.json(
      { success: true, message: "Login successful!", user: { id: user.id, name: user.name } }, 
      { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*', 
        }
      }
    );
  } catch (error) {
    return NextResponse.json({ error: "Failed to process login" }, { status: 500 });
  }
}