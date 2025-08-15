@echo off
echo Testing API Key Validation System
echo =====================================
echo.

echo 1. Testing invalid key format...
curl -s -X POST http://localhost:5002/api/settings/validate-openai-key -H "Content-Type: application/json" -d "{\"apiKey\":\"invalid-key\"}"
echo.
echo.

echo 2. Testing short key...
curl -s -X POST http://localhost:5002/api/settings/validate-openai-key -H "Content-Type: application/json" -d "{\"apiKey\":\"sk-short\"}"
echo.
echo.

echo 3. Testing proper format but fake key...
curl -s -X POST http://localhost:5002/api/settings/validate-openai-key -H "Content-Type: application/json" -d "{\"apiKey\":\"sk-test-1234567890123456789012345\"}"
echo.
echo.

echo 4. Testing missing key...
curl -s -X POST http://localhost:5002/api/settings/validate-openai-key -H "Content-Type: application/json" -d "{}"
echo.
echo.

echo 5. Testing transcript upload endpoint (should require file)...
curl -s -X POST http://localhost:5002/api/transcript/upload
echo.
echo.

echo All tests completed!
pause