# Railway Deployment Fix Guide

## Issue: Healthcheck Failing

Your Railway deployment is failing because the healthcheck endpoint is returning "service unavailable". This is likely due to missing environment variables.

## Root Cause

The Coral Agent requires the `GROQ_API_KEY` environment variable to function properly. Without it, the service starts but the healthcheck fails.

## Fix Steps

### 1. Check Railway Environment Variables

Go to your Railway dashboard and ensure these environment variables are set:

```bash
# Required for AI functionality
GROQ_API_KEY=your_groq_api_key_here

# Optional (for Supabase connection)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Server configuration
PORT=5555
```

### 2. Verify GROQ_API_KEY

The most important variable is `GROQ_API_KEY`. Without it:
- ✅ Service will start
- ❌ Healthcheck will fail
- ❌ AI analysis won't work

### 3. Test Locally First

Before deploying, test locally:

```bash
# Set environment variable
export GROQ_API_KEY=your_groq_api_key_here

# Start service
cd Coral-OpenDeepResearch-Agent
uv run python web_service.py

# Test health endpoint
curl http://localhost:5555/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "Coral Research Agent",
  "supabase_connected": false,
  "groq_connected": true,
  "environment": {
    "groq_api_key_set": true,
    "supabase_url_set": false,
    "port": "5555"
  }
}
```

### 4. Deploy to Railway

After setting the environment variables:

1. Push your code to GitHub
2. Railway will automatically redeploy
3. Check the deployment logs for any errors
4. Test the health endpoint: `https://your-railway-app.railway.app/health`

### 5. Troubleshooting

If healthcheck still fails:

1. **Check Railway logs** for startup errors
2. **Verify environment variables** are set correctly
3. **Test the health endpoint** manually
4. **Check if the service is starting** properly

### 6. Manual Health Check

You can test the health endpoint manually:

```bash
curl https://your-railway-app.railway.app/health
```

If it returns a response, the service is working. If it returns "service unavailable", there's a startup issue.

## Expected Behavior

After fixing the environment variables:

- ✅ Service starts successfully
- ✅ Healthcheck passes
- ✅ `/health` endpoint returns `{"status": "healthy"}`
- ✅ `/analyze` endpoint works for AI analysis

## Common Issues

1. **Missing GROQ_API_KEY**: Most common cause of healthcheck failure
2. **Invalid API key**: Check if your Groq API key is valid
3. **Network issues**: Railway might have temporary connectivity issues
4. **Memory limits**: Service might be hitting Railway's memory limits

## Next Steps

1. Set the `GROQ_API_KEY` in Railway dashboard
2. Redeploy the service
3. Test the health endpoint
4. Verify the service is working with your UpsellEngine 