## TODO
### Admin
- **US-A1**: What is the primary key? What is the operator ID? Missing trip cap enforcement
- think of a value for the credit-to-ETH exchange rate and subscription prices
### Rider
- **US-M2**: As a rider, I want to renew my subscription before it expires so that my TripCredit balance is topped up and my subscription period is extended.
- **US-M5**: As a rider, I want to be blocked from starting a trip once I have reached my tier's monthly trip cap for a specific transport mode or for a specific operator so that the system enforces the tier limits.
- **US-M7**: As a rider, I want to view how many trips I have used and how many remain for each transport mode and operator this month so that I can plan my travel.

### Operator
- **US-O3**: off-chain script for ```_payoutCredits()```
- off-chain script, that calls ```_openTrip()``` when event startTrip is emitted
- (set cap for max trips with my service)

### off-chain scripts
- operator automaticly calls ```_openTrip()``` when the event ```startTrip_e``` is emitted

### US to talk about
- US-A1: What is the primary key? What is the operator ID? Missing trip cap enforcement
- US-M2: in our scenario deleting the old credits is better
- US-M5/M6/M7: operator/mode specific caps for this scenario useful?

### design decisions to be made
- how to design the prices?
- can a rider start a new trip before completing the old one
- how can the riders renew their subscription? (unlimited, only next month, etc)
- what happens when my membership ends (e.g. payout, limited payout, ...)?
- it could be cheaper to renew a subscription because there wouldn't be a point in renewing when it would cost the same (if remaining credits are deleted)

### report/poster
- name, which US changed and why
- what was AI generated

## Done
### Admin
- **US-A1**: Register and whitelist partially implemented
- **US-A2**: As an admin, I want to remove an operator from the whitelist so that it can no longer submit new trip completions.
- **US-A3**: As an admin, I want to define subscription tiers (e.g. Commuter: 50 TripCredits / month at 0.01 ETH, Regular: 100 TripCredits / month at 0.02 ETH, Unlimited: 200 TripCredits / month at 0.03 ETH) and set the credit-to-ETH exchange rate so that riders can choose a plan and operators can be paid fairly.

### Rider
- **US-M1**: As a rider, I want to purchase a monthly subscription tier by sending ETH so that I receive the corresponding TripCredit balance.
- **US-M3**: As a rider with an expired subscription, I want to be prevented from starting a trip so that the system enforces the membership requirement.
- **US-M4**: As a rider, I want to call startTrip() with a registered operator so that an open trip record is created on-chain and the operator can later confirm delivery.
- **US-M6**: As a rider, I want to view my current TripCredit balance and subscription expiry so that I know how many trips I have available.

### Operator
- **US-O1**: As an operator, I want to set and update my flat credit price per trip so that the TripLedger charges riders the correct amount on completion.
- **US-O2**: As an operator, I want to call completeTrip() for an open trip record so that the agreed credit price is burned from the rider's balance and added to my accumulated earnings.
- **US-O3**: As an operator, I want to withdraw my accumulated TripCredits (converted to ETH at the current exchange rate) so that I receive payment for the trips I delivered.
- **US-O4**: As an operator, I want to view my total accumulated earnings so that I can track revenue before withdrawing.
