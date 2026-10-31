import { NextResponse } from 'next/server'

// Retired (PDPL, owner decision): verification by national ID is no longer offered — CR documents
// are reviewed (with the automatic read) and Wathq/Nafath replace it. Nothing calls this route.
export const runtime = 'nodejs'
export async function POST() { return NextResponse.json({ ok: false, error: 'gone' }, { status: 410 }) }
export async function GET() { return NextResponse.json({ ok: false, error: 'gone' }, { status: 410 }) }
