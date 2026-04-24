# Refamora Proposal Presentation Checklist

## Rule

Do not present Refamora live until every item in the `Presentation Gate` section is complete or has a documented fallback.

## Presentation Gate

- [ ] One known-good build is installed on the primary presentation device
- [ ] One backup device or backup build is ready
- [ ] Buyer demo account can log in
- [ ] Seller demo account can log in
- [ ] Admin demo account can log in
- [ ] Demo Supabase project has the required migrations applied
- [ ] Demo storage buckets and policies are working for existing seeded assets
- [ ] Internet connection for the venue is tested or a fallback hotspot is ready
- [ ] The presenter has rehearsed the exact screen flow at least once end to end

## Buyer Demo Checklist

- [ ] Buyer can sign in without error
- [ ] Buyer feed loads with realistic listings
- [ ] Buyer can open one target listing
- [ ] Listing detail shows seller trust information clearly
- [ ] Buyer can send an inquiry or open a pre-seeded inquiry thread
- [ ] Buyer can show the conversation thread
- [ ] Buyer can show the notification inbox
- [ ] Buyer flow has one fallback route if live inquiry send fails

## Seller Demo Checklist

- [ ] Seller can sign in without error
- [ ] Seller dashboard or listings screen loads
- [ ] Seller can open an existing polished listing
- [ ] Seller can create or edit a listing without visible issues
- [ ] Seller inbox shows at least one realistic buyer inquiry
- [ ] Seller can reply or show an already replied thread
- [ ] Seller verification screen is presentable
- [ ] Seller flow has one fallback route if live reply send fails

## Admin and Trust Checklist

- [ ] Admin can open moderation dashboard
- [ ] Admin can show one listing report example
- [ ] Admin can show one AI review queue example
- [ ] Admin can show one seller verification example
- [ ] Admin can open the app crash reports screen if asked
- [ ] Verified badge is visible somewhere in buyer-facing UI
- [ ] Admin actions do not require manual SQL during the presentation
- [ ] The presenter can explain why moderation and verification matter to the system

## Data Readiness Checklist

- [ ] At least 3 realistic listings exist
- [ ] At least 1 buyer inquiry thread exists
- [ ] At least 1 seller reply thread exists
- [ ] At least 1 reported listing exists
- [ ] At least 1 pending verification request exists
- [ ] Demo listings use clean titles, prices, quantities, images, and cities
- [ ] No embarrassing placeholder or broken data appears in the main walkthrough

## Build and Device Checklist

- [ ] App launches successfully on the presentation device
- [ ] Login works on the device
- [ ] Feed works on the device
- [ ] Listing detail works on the device
- [ ] Messaging works on the device
- [ ] Admin screens work on the device
- [ ] Fonts, icons, and images render correctly on the device
- [ ] The device is fully charged and has a charger or power bank available

## Presentation Script Checklist

- [ ] Opening explanation is under 1 minute
- [ ] Problem statement is clear
- [ ] Buyer story is clear
- [ ] Seller story is clear
- [ ] Admin trust story is clear
- [ ] The presenter can state what is already implemented
- [ ] The presenter can state what is intentionally deferred after proposal
- [ ] Closing value statement is prepared

## Fallback Materials

- [ ] Screenshots exist for buyer flow
- [ ] Screenshots exist for seller flow
- [ ] Screenshots exist for admin flow
- [ ] A short verbal fallback script exists if internet or login fails
- [ ] A fallback explanation exists for unfinished production features

## Final Go or No-Go

You are ready to present live only if:

- [ ] all critical login and navigation checks pass
- [ ] the main buyer, seller, and admin demo paths have been rehearsed
- [ ] the presentation device build is stable
- [ ] the seeded data matches the walkthrough

If any of those are not true, stop adding new features and fix demo reliability first.
