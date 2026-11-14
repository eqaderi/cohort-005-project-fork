# Cadence

An online course platform where learners buy courses and work through their lessons.

## Language

### Refunds

**Refund Request**:
A learner's request, made within the Refund Window, to get back exactly what they paid for one course purchase. A purchase can have at most one Refund Request.
_Avoid_: Refund (for the request itself), cancellation, cancel my purchase, reversal, chargeback

**Refund Request states**:
- _Requested_: waiting for a decision from an admin or the course's instructor.
- _Approved_: the decider said yes; a Refund is now owed.
- _Declined_: the decider said no, with a reason the learner can see.

Approved and Declined are final.

**Approve / Decline**:
The two decisions on a Refund Request, made by an admin or the course's instructor.
_Avoid_: Confirm, accept, reject

**Refund**:
Money actually returned to a learner for an Approved Refund Request: exactly what they paid, whatever the course costs now. Every Refund comes from exactly one Approved Refund Request.
_Avoid_: Reversal, chargeback

**Refund states**:
- _Pending_: the money has not yet reached the learner.
- _Completed_: the money has reached the learner.
- _Failed_: the payout did not go through and must be retried, which puts it back to Pending.

**Refund Window**:
The 14 calendar days after a purchase, counted in UTC and including the whole 14th day, during which a Refund Request can be made.
_Avoid_: Cancel window

**Chargeback**:
The cardholder's bank forcing a payment back through a dispute, outside our control. A Chargeback is never a Refund.
_Avoid_: Using it to mean a Refund
