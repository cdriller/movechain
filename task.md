# Assignment 3: Public Transit & Micro-Mobility Platform
## Scenario

**MoveChain** is a unified urban mobility network. Public transit operators (bus, tram, metro), ride-share providers, and micro-mobility fleets (e-scooters, e-bikes) register as **operators** on a shared smart contract platform. Users purchase a monthly subscription that mints a bundle of **TripCredits** (an ERC-1155 token, ID 0) to their wallet and entitles them to a capped number of trips per calendar month.

Subscriptions come in three tiers: **Commuter** (up to 30 trips/month per transport mode and per operator), **Regular** (up to 60 trips/month), and **Unlimited** (no cap). Caps are two-dimensional: the ```TripLedger``` tracks trips per **transport mode** (e.g. transit, ride-share, micro-mobility) AND per **operator** within the same month, reset on the first day of each calendar month.

Unlike the other platforms, credit deduction in MoveChain is a **two-phase process**: the rider calls ```startTrip()``` to open a record on-chain, and the operator later calls ```completeTrip()``` to close it, at which point the operator's flat credit price is deducted from the rider's TripCredit balance and added to operator earnings. A trip that is never completed by the operator remains open and does not consume credits. This lifecycle ensures that fares are only charged once the service is confirmed delivered.

The platform is governed by an **admin** (the MoveChain authority) who whitelists operators, sets subscription tiers, and manages the credit-to-ETH exchange rate. No central intermediary holds rider funds: payments flow directly through the contracts.

## Stakeholders
| Actor | Description |
| --- | :----: |
| Admin | Deploys and configures the platform; whitelists operators; sets subscription tiers and exchange rate |
| Rider | Purchases a subscription; holds TripCredits; starts and completes trips |
| Opterator | Registered mobility provider; sets credit price per trip; submits trip completions; withdraws earnings |

## User Stories
### Admin
- **US-A1**: As an admin, I want to register and whitelist an operator (by wallet address, name, operator ID, and transport mode) so that riders can use their service and trip caps can be enforced per mode and per operator.
- **US-A2**: As an admin, I want to remove an operator from the whitelist so that it can no longer submit new trip completions.
- **US-A3**: As an admin, I want to define subscription tiers (e.g. Commuter: 50 TripCredits / month at 0.01 ETH, Regular: 100 TripCredits / month at 0.02 ETH, Unlimited: 200 TripCredits / month at 0.03 ETH) and set the credit-to-ETH exchange rate so that riders can choose a plan and operators can be paid fairly.

### Rider
- **US-M1**: As a rider, I want to purchase a monthly subscription tier by sending ETH so that I receive the corresponding TripCredit balance.
- **US-M2**: As a rider, I want to renew my subscription before it expires so that my TripCredit balance is topped up and my subscription period is extended.
- **US-M3**: As a rider with an expired subscription, I want to be prevented from starting a trip so that the system enforces the membership requirement.
- **US-M4**: As a rider, I want to call startTrip() with a registered operator so that an open trip record is created on-chain and the operator can later confirm delivery.
- **US-M5**: As a rider, I want to be blocked from starting a trip once I have reached my tier's monthly trip cap for a specific transport mode or for a specific operator so that the system enforces the tier limits.
- **US-M6**: As a rider, I want to view my current TripCredit balance and subscription expiry so that I know how many trips I have available.
- **US-M7**: As a rider, I want to view how many trips I have used and how many remain for each transport mode and operator this month so that I can plan my travel.

### Opterator
- **US-O1**: As an operator, I want to set and update my flat credit price per trip so that the TripLedger charges riders the correct amount on completion.
- **US-O2**: As an operator, I want to call completeTrip() for an open trip record so that the agreed credit price is burned from the rider's balance and added to my accumulated earnings.
- **US-O3**: As an operator, I want to withdraw my accumulated TripCredits (converted to ETH at the current exchange rate) so that I receive payment for the trips I delivered.
- **US-O4**: As an operator, I want to view my total accumulated earnings so that I can track revenue before withdrawing.

## The Preparation
1. Model one or more simplified business processes covering the use cases from the stakeholders perspectives.
2. Identify all involved stakeholders and what each contributes to each process.
3. Plan all involved smart contracts and their purpose.
4. Map the interactions between stakeholders and contracts.
5. In half a page or less: Why is a smart-contract-based system suitable for this use case? What problems does it solve, what problems does it create?

## The Frontend
Develop a TypeScript/JavaScript Single-Page-Frontend for the different stakeholders or one simple frontend for each. The frontend must enable the features from the User Stories. The frontend does not need to be pretty it just needs to be funcitonal.

## The Cherry On Top
For each member of your group, add a specific unique feature to this smart contract platform. If your group consists of 3 members, you would need three (tiny) additional features of your choice. A feature could be something like a cancellation in between months, or a refund, or a provider rating, etc. Please be creative.

## Future Requirements
Towards the middle of the semester, the stakeholders might change the scope or add requirements. Stay tuned.

## Required Artifacts
- all code (contracts,front-end,tests, analysis, ci-cd, etc.) must be in a git Mono-Repository
- two (digital) posters in vertical A1 format. (one intermediary and one final poster) You may use typical Slidemaking-Software. Hand in your posters in PDF form.
- be prepared to present both posters live.
- A final report, up to 16 pages in LNCS format: https://www.springer.com/gp/computer-science/lncs/conference-proceedings-guidelines. Make sure to follow the instructions for proceesings authors and use the proceedings template: https://www.overleaf.com/latex/templates/springer-lecture-notes-in-computer-science/kzwwpvhwnvfj#.WuA4JS5uZpi
- Every monday, you must push a commit to your main branch that is a "running" version of your current state. Be prepared to discuss what you build.