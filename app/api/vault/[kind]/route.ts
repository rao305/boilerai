import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { VaultKind } from '@prisma/client'

// Rate limiting for vault operations
const vaultRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 1000,
  tokensPerInterval: 10, // 10 requests per minute per user
})

async function authenticateRequest(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  // Apply rate limiting per user
  const identifier = `vault:${session.user.id}`
  const { success } = await vaultRateLimit(identifier)
  if (!success) {
    throw new Error('Rate limit exceeded')
  }

  return session.user.id
}

function validateVaultKind(kind: string): VaultKind {
  const validKinds: VaultKind[] = ['API_KEY', 'ASSISTANT_SETTINGS', 'CHAT_HISTORY', 'DEK_WRAPPED']
  if (!validKinds.includes(kind as VaultKind)) {
    throw new Error('Invalid vault kind')
  }
  return kind as VaultKind
}

function validateEncryptedData(data: any): {
  ciphertext: Buffer
  nonce: Buffer  
  aad?: string
} {
  if (!data.ciphertext || !data.nonce) {
    throw new Error('Missing required encrypted data fields')
  }

  // Validate base64 encoded data
  try {
    const ciphertext = Buffer.from(data.ciphertext, 'base64')
    const nonce = Buffer.from(data.nonce, 'base64')

    // Basic size validation
    if (ciphertext.length === 0 || ciphertext.length > 1024 * 1024) { // Max 1MB
      throw new Error('Invalid ciphertext size')
    }

    if (nonce.length !== 12) { // AES-GCM nonce is 96 bits (12 bytes)
      throw new Error('Invalid nonce size')
    }

    return {
      ciphertext,
      nonce,
      aad: data.aad || undefined,
    }
  } catch (error) {
    throw new Error('Invalid encrypted data format')
  }
}

// GET /api/vault/[kind] - Retrieve encrypted item
export async function GET(
  request: NextRequest,
  { params }: { params: { kind: string } }
) {
  try {
    const userId = await authenticateRequest(request)
    const kind = validateVaultKind(params.kind)

    const vaultItem = await prisma.vaultItem.findUnique({
      where: {
        userId_kind: {
          userId,
          kind,
        },
      },
      select: {
        ciphertext: true,
        nonce: true,
        aad: true,
        updatedAt: true,
      },
    })

    if (!vaultItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Return encrypted data as base64
    return NextResponse.json({
      ciphertext: vaultItem.ciphertext.toString('base64'),
      nonce: vaultItem.nonce.toString('base64'),
      aad: vaultItem.aad,
      lastUpdated: vaultItem.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Vault GET error:', error)
    
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.message === 'Rate limit exceeded') {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
      }
      if (error.message.includes('Invalid')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/vault/[kind] - Store encrypted item
export async function POST(
  request: NextRequest,
  { params }: { params: { kind: string } }
) {
  try {
    const userId = await authenticateRequest(request)
    const kind = validateVaultKind(params.kind)

    const body = await request.json()
    const encryptedData = validateEncryptedData(body)

    // Store encrypted data (server never sees plaintext)
    const vaultItem = await prisma.vaultItem.upsert({
      where: {
        userId_kind: {
          userId,
          kind,
        },
      },
      update: {
        ciphertext: encryptedData.ciphertext,
        nonce: encryptedData.nonce,
        aad: encryptedData.aad,
      },
      create: {
        userId,
        kind,
        ciphertext: encryptedData.ciphertext,
        nonce: encryptedData.nonce,
        aad: encryptedData.aad,
      },
    })

    return NextResponse.json({
      success: true,
      lastUpdated: vaultItem.updatedAt.toISOString(),
    }, { status: 201 })
  } catch (error) {
    console.error('Vault POST error:', error)
    
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.message === 'Rate limit exceeded') {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
      }
      if (error.message.includes('Invalid')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/vault/[kind] - Delete encrypted item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { kind: string } }
) {
  try {
    const userId = await authenticateRequest(request)
    const kind = validateVaultKind(params.kind)

    const deletedItem = await prisma.vaultItem.delete({
      where: {
        userId_kind: {
          userId,
          kind,
        },
      },
    })

    return NextResponse.json({
      success: true,
      deletedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Vault DELETE error:', error)
    
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.message === 'Rate limit exceeded') {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
      }
      if (error.message.includes('Invalid')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    // Handle Prisma not found error
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}