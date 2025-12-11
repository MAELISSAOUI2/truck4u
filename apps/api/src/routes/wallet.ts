import express from 'express';
import { prisma } from '@truck4u/database';
import { verifyToken } from '../middleware/auth';

const router = express.Router();

// ============================================
// WALLET BALANCE & INFO
// ============================================

/**
 * GET /api/wallet/balance
 * Get customer's wallet balance
 */
router.get('/balance', verifyToken, async (req, res) => {
  try {
    const customerId = (req as any).userId;

    // Get or create wallet
    let wallet = await prisma.wallet.findUnique({
      where: { customerId },
    });

    if (!wallet) {
      // Create wallet if doesn't exist
      wallet = await prisma.wallet.create({
        data: {
          customerId,
          balance: 0,
          heldAmount: 0,
          availableAmount: 0,
        },
      });
    }

    res.json({
      success: true,
      wallet: {
        id: wallet.id,
        balance: wallet.balance,
        heldAmount: wallet.heldAmount,
        availableAmount: wallet.availableAmount,
      },
    });
  } catch (error) {
    console.error('[Wallet] Error fetching balance:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du solde' });
  }
});

/**
 * GET /api/wallet/transactions
 * Get transaction history
 */
router.get('/transactions', verifyToken, async (req, res) => {
  try {
    const customerId = (req as any).userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const wallet = await prisma.wallet.findUnique({
      where: { customerId },
    });

    if (!wallet) {
      return res.json({
        success: true,
        transactions: [],
        total: 0,
        page,
        totalPages: 0,
      });
    }

    const [transactions, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          ride: {
            select: {
              id: true,
              pickupAddress: true,
              dropoffAddress: true,
              status: true,
            },
          },
        },
      }),
      prisma.walletTransaction.count({
        where: { walletId: wallet.id },
      }),
    ]);

    res.json({
      success: true,
      transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('[Wallet] Error fetching transactions:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des transactions' });
  }
});

// ============================================
// DEPOSIT (RECHARGE)
// ============================================

/**
 * POST /api/wallet/deposit
 * Add funds to wallet
 */
router.post('/deposit', verifyToken, async (req, res) => {
  try {
    const customerId = (req as any).userId;
    const { amount, paymentMethod } = req.body;

    // Validation
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Montant invalide' });
    }

    if (amount > 10000) {
      return res.status(400).json({ error: 'Montant maximum: 10000 DT' });
    }

    // Get or create wallet
    let wallet = await prisma.wallet.findUnique({
      where: { customerId },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          customerId,
          balance: 0,
          heldAmount: 0,
          availableAmount: 0,
        },
      });
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + amount;

    // Create transaction and update wallet in a transaction
    const [transaction, updatedWallet] = await prisma.$transaction([
      // Create transaction
      prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEPOSIT',
          amount,
          balanceBefore,
          balanceAfter,
          status: 'COMPLETED',
          description: `Recharge de ${amount} DT`,
          metadata: {
            paymentMethod: paymentMethod || 'CARD',
          },
          completedAt: new Date(),
        },
      }),

      // Update wallet balance
      prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: balanceAfter,
          availableAmount: balanceAfter - wallet.heldAmount,
        },
      }),
    ]);

    res.json({
      success: true,
      message: 'Recharge effectuée avec succès',
      transaction: {
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        status: transaction.status,
        createdAt: transaction.createdAt,
      },
      wallet: {
        balance: updatedWallet.balance,
        heldAmount: updatedWallet.heldAmount,
        availableAmount: updatedWallet.availableAmount,
      },
    });
  } catch (error) {
    console.error('[Wallet] Deposit error:', error);
    res.status(500).json({ error: 'Erreur lors de la recharge' });
  }
});

// ============================================
// HOLD (BLOQUER MONTANT)
// ============================================

/**
 * POST /api/wallet/hold
 * Hold funds for a ride (dark kitchen style)
 */
router.post('/hold', verifyToken, async (req, res) => {
  try {
    const customerId = (req as any).userId;
    const { amount, rideId } = req.body;

    // Validation
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Montant invalide' });
    }

    if (!rideId) {
      return res.status(400).json({ error: 'ID de course requis' });
    }

    const wallet = await prisma.wallet.findUnique({
      where: { customerId },
    });

    if (!wallet) {
      return res.status(400).json({ error: 'Wallet non trouvé' });
    }

    // Check if enough available balance
    if (wallet.availableAmount < amount) {
      return res.status(400).json({
        error: 'Solde insuffisant',
        required: amount,
        available: wallet.availableAmount,
      });
    }

    const balanceBefore = wallet.balance;

    // Create hold transaction and update wallet
    const [transaction, updatedWallet] = await prisma.$transaction([
      prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'HOLD',
          amount,
          rideId,
          balanceBefore,
          balanceAfter: balanceBefore, // Balance doesn't change, only held amount
          status: 'PENDING',
          description: `Montant bloqué pour course #${rideId.slice(0, 8)}`,
        },
      }),

      prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          heldAmount: wallet.heldAmount + amount,
          availableAmount: wallet.availableAmount - amount,
        },
      }),
    ]);

    res.json({
      success: true,
      message: 'Montant bloqué avec succès',
      transaction: {
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        status: transaction.status,
      },
      wallet: {
        balance: updatedWallet.balance,
        heldAmount: updatedWallet.heldAmount,
        availableAmount: updatedWallet.availableAmount,
      },
    });
  } catch (error) {
    console.error('[Wallet] Hold error:', error);
    res.status(500).json({ error: 'Erreur lors du blocage du montant' });
  }
});

// ============================================
// RELEASE (LIBÉRER ET DÉBITER)
// ============================================

/**
 * POST /api/wallet/release
 * Release held funds and charge for completed ride
 */
router.post('/release', verifyToken, async (req, res) => {
  try {
    const customerId = (req as any).userId;
    const { rideId } = req.body;

    if (!rideId) {
      return res.status(400).json({ error: 'ID de course requis' });
    }

    const wallet = await prisma.wallet.findUnique({
      where: { customerId },
    });

    if (!wallet) {
      return res.status(400).json({ error: 'Wallet non trouvé' });
    }

    // Find the HOLD transaction for this ride
    const holdTransaction = await prisma.walletTransaction.findFirst({
      where: {
        walletId: wallet.id,
        rideId,
        type: 'HOLD',
        status: 'PENDING',
      },
    });

    if (!holdTransaction) {
      return res.status(404).json({ error: 'Aucun montant bloqué trouvé pour cette course' });
    }

    const amount = holdTransaction.amount;
    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore - amount;

    // Release hold, charge, and update wallet in transaction
    const [releaseTransaction, updatedWallet] = await prisma.$transaction([
      // Mark hold as completed
      prisma.walletTransaction.update({
        where: { id: holdTransaction.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      }),

      // Create RELEASE transaction (debit)
      prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'RELEASE',
          amount,
          rideId,
          balanceBefore,
          balanceAfter,
          status: 'COMPLETED',
          description: `Paiement course #${rideId.slice(0, 8)}`,
          completedAt: new Date(),
        },
      }),

      // Update wallet: reduce balance and held amount
      prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: balanceAfter,
          heldAmount: wallet.heldAmount - amount,
          availableAmount: balanceAfter - (wallet.heldAmount - amount),
        },
      }),
    ]);

    res.json({
      success: true,
      message: 'Paiement effectué avec succès',
      transaction: {
        id: releaseTransaction[1].id,
        type: releaseTransaction[1].type,
        amount: releaseTransaction[1].amount,
        status: releaseTransaction[1].status,
      },
      wallet: {
        balance: updatedWallet.balance,
        heldAmount: updatedWallet.heldAmount,
        availableAmount: updatedWallet.availableAmount,
      },
    });
  } catch (error) {
    console.error('[Wallet] Release error:', error);
    res.status(500).json({ error: 'Erreur lors de la libération du montant' });
  }
});

// ============================================
// REFUND (REMBOURSER)
// ============================================

/**
 * POST /api/wallet/refund
 * Refund a held amount (cancelled ride)
 */
router.post('/refund', verifyToken, async (req, res) => {
  try {
    const customerId = (req as any).userId;
    const { rideId, reason } = req.body;

    if (!rideId) {
      return res.status(400).json({ error: 'ID de course requis' });
    }

    const wallet = await prisma.wallet.findUnique({
      where: { customerId },
    });

    if (!wallet) {
      return res.status(400).json({ error: 'Wallet non trouvé' });
    }

    // Find the HOLD transaction
    const holdTransaction = await prisma.walletTransaction.findFirst({
      where: {
        walletId: wallet.id,
        rideId,
        type: 'HOLD',
        status: 'PENDING',
      },
    });

    if (!holdTransaction) {
      return res.status(404).json({ error: 'Aucun montant bloqué trouvé' });
    }

    const amount = holdTransaction.amount;
    const balanceBefore = wallet.balance;

    // Cancel hold and update wallet
    const [refundTransaction, updatedWallet] = await prisma.$transaction([
      // Mark hold as cancelled
      prisma.walletTransaction.update({
        where: { id: holdTransaction.id },
        data: {
          status: 'CANCELLED',
          completedAt: new Date(),
        },
      }),

      // Create REFUND transaction
      prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'REFUND',
          amount,
          rideId,
          balanceBefore,
          balanceAfter: balanceBefore, // Balance unchanged, just release hold
          status: 'COMPLETED',
          description: reason || `Remboursement course #${rideId.slice(0, 8)}`,
          completedAt: new Date(),
        },
      }),

      // Update wallet: release held amount
      prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          heldAmount: wallet.heldAmount - amount,
          availableAmount: wallet.availableAmount + amount,
        },
      }),
    ]);

    res.json({
      success: true,
      message: 'Remboursement effectué avec succès',
      transaction: {
        id: refundTransaction[1].id,
        type: refundTransaction[1].type,
        amount: refundTransaction[1].amount,
        status: refundTransaction[1].status,
      },
      wallet: {
        balance: updatedWallet.balance,
        heldAmount: updatedWallet.heldAmount,
        availableAmount: updatedWallet.availableAmount,
      },
    });
  } catch (error) {
    console.error('[Wallet] Refund error:', error);
    res.status(500).json({ error: 'Erreur lors du remboursement' });
  }
});

export default router;
