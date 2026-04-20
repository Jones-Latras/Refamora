# Refamora System Architecture

This document gives a short description of the Refamora system architecture based on the current prototype.

## Overview

Refamora uses a mobile client-server architecture with an AI service layer. The Expo React Native app is the user-facing client for both farmers and buyers. Supabase provides the backend services for authentication, database storage, media storage, and Edge Functions. AI-enabled features are processed through backend functions, which connect to the appropriate text or vision model and return structured results to the app.

## Main Components

### 1. Mobile Application Layer

- Built with Expo, React Native, and Expo Router
- Supports two roles:
  - Farmers create listings, manage listings, and respond to buyers
  - Buyers browse listings, filter results, compare options, and send inquiries
- Handles the user interface, form input, navigation, and client-side validation

### 2. Backend and Data Layer

- Supabase Auth manages sign-in, session handling, and role-based access
- Supabase Postgres stores users, listings, contact requests, messages, analytics, and AI event logs
- Supabase Storage stores listing images and profile images
- Row-level security helps ensure users only access allowed records

### 3. AI Service Layer

- The app sends AI requests to Supabase Edge Functions
- Edge Functions process features such as:
  - listing assistance
  - waste-to-value advice
  - photo quality checking
  - listing moderation
  - buyer search interpretation
  - inquiry summary and reply drafting
- The AI layer selects the proper provider depending on the task

### 4. AI Providers

- Local Gemma is used for text-based AI tasks
- Groq Vision is used for image-based analysis and moderation
- Gemini can be used as an optional fallback provider

## Request Flow

1. A user performs an action in the mobile app, such as creating a listing or requesting AI help.
2. The app sends the request to Supabase services or an Edge Function.
3. The Edge Function validates the input and routes the task to the correct AI provider when needed.
4. The AI provider returns a structured result.
5. The backend sends the result back to the app.
6. The app displays the output to the user and updates stored records if needed.

## Architecture Summary

In simple terms, Refamora combines a mobile marketplace frontend, a Supabase backend, and a modular AI layer. This setup allows the system to support marketplace transactions, manage data securely, and add intelligent assistance without tightly coupling the app to a single AI provider.
