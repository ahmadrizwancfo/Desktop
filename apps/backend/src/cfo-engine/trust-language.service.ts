/**
 * FounderCFO — Trust Language System
 * ====================================
 * 
 * Every message follows the Trust Structure:
 *   [What is happening]
 *   [Why it is safe]
 *   [What control user has]
 * 
 * Tone: "Calm, Confident CFO" — like a CFO sitting next to the founder.
 *   - Clear, direct, slightly human
 *   - Zero jargon, zero fluff
 *   - Never sounds like a system or chatbot
 */

import { Injectable } from '@nestjs/common';

// ═══════════════════════════════════════════════════════════════════════════
// TRUST MESSAGE TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

export interface TrustMessage {
    /** The primary message — what the founder reads first */
    headline: string;
    /** The supporting explanation — why it's safe, what they control */
    body: string;
    /** Optional short label for UI badges/tags */
    badge?: string;
    /** The internal technical reason (for audit logs only, never shown to user) */
    internalReason: string;
}

/**
 * Formats currency for Indian founders.
 */
function fmt(n: number): string {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${Math.round(n)}`;
}

@Injectable()
export class TrustLanguageService {

    // ─── A. SHADOW MODE (Testing Safely) ────────────────────────────────────

    shadowModeMessage(actionTitle: string, expectedImpact: number): TrustMessage {
        return {
            headline: `We've identified a potential improvement: "${actionTitle}".`,
            body: `We're testing this safely in the background first — no changes will be made until it proves reliable. Your cash is safe and protected. Every setting is locked and you'll always have full control before anything is applied.`,
            badge: 'Testing Safely',
            internalReason: `Shadow Mode: Action "${actionTitle}" (impact: ${expectedImpact}%) identified for background validation.`,
        };
    }

    // ─── B. PENDING EXECUTION (Scheduled, Cancellable) ──────────────────────

    pendingExecutionMessage(actionTitle: string, delayMinutes: number, expectedImpact: number): TrustMessage {
        const timeLabel = delayMinutes >= 60
            ? `${Math.round(delayMinutes / 60)} hour${delayMinutes >= 120 ? 's' : ''}`
            : `${delayMinutes} minutes`;

        return {
            headline: `"${actionTitle}" is scheduled to apply in ${timeLabel}.`,
            body: `This has been tested and verified as safe. Your cash is locked and protected. Expected impact: ~${Math.abs(expectedImpact)}% burn reduction. You can cancel anytime before it applies — one click, no questions asked.`,
            badge: 'Scheduled',
            internalReason: `Scheduled: Execution in ${delayMinutes}m. Impact: ${expectedImpact}%.`,
        };
    }

    // ─── C. AUTO-EXECUTED (Completed Successfully) ──────────────────────────

    autoExecutedMessage(actionTitle: string, expectedImpact: number): TrustMessage {
        return {
            headline: `"${actionTitle}" has been applied.`,
            body: `This was tested, scheduled, and verified before execution. Expected savings: ~${fmt(expectedImpact)}. You can undo this at any time — your previous settings are saved.`,
            badge: 'Applied by Auto-Pilot',
            internalReason: `Auto-executed: "${actionTitle}" applied after delay window and final safety re-check.`,
        };
    }

    // ─── D. BLOCKED ACTION (Protection) ─────────────────────────────────────

    blockedActionMessage(actionTitle: string, reasons: string[]): TrustMessage {
        // Translate technical check names into human language
        const humanReasons = reasons.map(r => this.humanizeCheckName(r));
        const reasonText = humanReasons.length === 1
            ? humanReasons[0]
            : humanReasons.slice(0, -1).join(', ') + ' and ' + humanReasons[humanReasons.length - 1];

        return {
            headline: `"${actionTitle}" was reviewed but not applied.`,
            body: `We held this back because ${reasonText}. This is a safety measure — we only auto-apply actions when all conditions are met. You can still review and apply it manually.`,
            badge: 'Held Back',
            internalReason: `Blocked: Failed checks — ${reasons.join(', ')}.`,
        };
    }

    // ─── E. AUTO-PILOT DISABLED (Safety, Not Failure) ───────────────────────

    autoPilotDisabledMessage(reason: 'uncertainty' | 'failures' | 'rollbacks'): TrustMessage {
        const messages: Record<string, { headline: string; body: string }> = {
            uncertainty: {
                headline: 'Auto-Pilot has been paused for your protection.',
                body: `Market conditions are unusually volatile right now. We've paused all automated actions until things stabilize. All pending actions have been cancelled. You can still take manual actions at any time.`,
            },
            failures: {
                headline: 'Auto-Pilot has been paused to protect your finances.',
                body: `Recent automated decisions didn't perform as expected. We've paused to recalibrate and won't resume until accuracy improves. Your money is safe — no further automated changes will be made.`,
            },
            rollbacks: {
                headline: 'Auto-Pilot has been dialed back.',
                body: `You've been undoing automated actions more than usual, which tells us we're not matching your preferences well enough. We've switched to a more cautious mode. You stay in control.`,
            },
        };

        const msg = messages[reason];

        return {
            headline: msg.headline,
            body: msg.body,
            badge: 'Paused',
            internalReason: `Auto-Pilot disabled: ${reason}.`,
        };
    }

    // ─── F. CANCELLATION CONFIRMATION ────────────────────────────────────────

    cancellationMessage(actionTitle: string): TrustMessage {
        return {
            headline: `"${actionTitle}" has been cancelled.`,
            body: `The action has been stopped immediately. Your original settings are safe and locked, and no changes were made. You stay in full control.`,
            badge: 'Cancelled',
            internalReason: `Founder manually cancelled "${actionTitle}" before execution.`,
        };
    }

    // ─── G. OPTIONAL LEARNING PROMPT (after cancel) ─────────────────────────

    cancellationLearningPrompt(): { question: string; options: string[] } {
        return {
            question: 'What made you cancel this?',
            options: [
                'Not the right time',
                'I don\'t agree with this action',
                'I want to review it more',
                'The impact seems too large',
                'Skip — no reason',
            ],
        };
    }

    // ─── JARGON TRANSLATOR ──────────────────────────────────────────────────

    private humanizeCheckName(check: string): string {
        const map: Record<string, string> = {
            autoPilotOn: 'Auto-Pilot is currently turned off',
            systemStable: 'the system is recalibrating its accuracy',
            lowRisk: 'the action involves higher risk than we auto-apply',
            seenBefore: 'this is a new action we haven\'t tested yet',
            highConfidence: 'our confidence in this action isn\'t high enough yet',
            highSystemAccuracy: 'our overall accuracy needs to improve first',
            highCategoryConfidence: 'this type of action hasn\'t performed well recently',
            underUserLimit: 'the impact exceeds your safety limit',
            notSuppressed: 'this category has been paused due to past issues',
            notUnderReview: 'this action is currently under manual review',
            envStable: 'market conditions are too volatile right now',
        };
        return map[check] || `a safety condition wasn't met`;
    }

    // ─── ENVIRONMENT UNCERTAINTY UI MESSAGE ─────────────────────────────────

    environmentWarningMessage(score: number): TrustMessage {
        if (score > 40) {
            return {
                headline: 'Auto-Pilot is paused — conditions are unstable.',
                body: 'External market signals suggest higher-than-normal uncertainty. All automated actions have been paused. You can still take any action manually. We\'ll resume when conditions stabilize.',
                badge: 'Environment Lock',
                internalReason: `envUncertaintyScore: ${score} (>40 threshold).`,
            };
        }

        return {
            headline: 'Conditions are slightly elevated — Auto-Pilot is being cautious.',
            body: `We've detected some market variance. Auto-Pilot is operating with extra caution. Only the safest actions will be applied automatically.`,
            badge: 'High Variance',
            internalReason: `envUncertaintyScore: ${score} (>30, <40 — cautious mode).`,
        };
    }
}
