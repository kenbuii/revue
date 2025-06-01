# Media API Setup Guide

This guide explains how to set up the media search APIs for the step5 genre selection feature.

## 🔑 Required API Keys

### 1. The Movie Database (TMDb) API
- **What it provides:** Movies and TV shows data
- **Cost:** Free (40,000 requests/day)
- **Setup:**
  1. Go to https://www.themoviedb.org/
  2. Create an account
  3. Go to Settings > API
  4. Request an API key (instant approval)
  5. Copy your API key

### 2. Google Books API (Optional)
- **What it provides:** Books data
- **Cost:** Free (1,000 requests/day, can be increased)
- **Setup:**
  1. Go to https://developers.google.com/books/docs/v1/using
  2. Create a Google Cloud project
  3. Enable the Books API
  4. Create credentials (API key)
  5. Copy your API key

## 📝 Environment Variables

Add these to your `.env` file:

```bash
# Add these lines to your .env file
EXPO_PUBLIC_TMDB_API_KEY=your_tmdb_api_key_here
EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY=your_google_books_api_key_here
```

## 🔧 Fallback Behavior

The app is designed to work even without API keys:

- **With API Keys:** Real-time search of movies, TV shows, and books
- **Without API Keys:** Fallback to curated sample data for testing

## ✅ Testing

1. **Without API Keys:**
   - Search will return sample/fallback data
   - Perfect for development and testing

2. **With API Keys:**
   - Search will return real media data
   - Images and detailed information included

## 🔒 Security

- API keys are stored in environment variables
- Only client-side HTTP requests (no server-side exposure)
- Rate limiting handled gracefully with fallbacks

## 📊 Features

- **Multi-API Search:** Searches movies, TV shows, and books simultaneously
- **Image Support:** Poster/cover images when available
- **Graceful Degradation:** Works without APIs using fallback data
- **No WebSocket Issues:** Uses only HTTP requests
- **Debounced Search:** 500ms delay to prevent API spam
- **Result Limits:** 20 total results to optimize performance 