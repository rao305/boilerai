# BoilerAI Diagnosis Report

## Direct Provider Usage Audit
### unifiedAIService usage:
backend/test_rag_fix.js:6:const unifiedAIService = require('./src/services/unifiedAIService');
backend/test_rag_fix.js:71:    const ragResult = await unifiedAIService.generateRAGResponse(
backend/src/routes/advisor.js:8:const unifiedAIService = require('../services/unifiedAIService');
backend/src/routes/advisor.js:128:      const response = await unifiedAIService.sendMessage(llmOptions);
backend/src/routes/advisor.js:171:    const response = await unifiedAIService.sendMessage({
backend/src/routes/courses.js:5:const unifiedAIService = require('../services/unifiedAIService');
backend/src/routes/courses.js:12:    return await unifiedAIService.generateCourseData(filters, apiKey);
backend/src/routes/courses.js:15:    return unifiedAIService.getStaticCourseData();
backend/src/routes/courses.js:24:    return await unifiedAIService.searchCoursesWithAI(searchTerm, apiKey);
backend/src/routes/advisor_diagnostic.js:7:const unifiedAIService = require('../services/unifiedAIService');
backend/src/routes/advisor_diagnostic.js:71:        finalMode: 'unifiedAIService',
backend/src/routes/advisor_diagnostic.js:94:    const response = await unifiedAIService.sendMessage(llmOptions);
backend/src/routes/advisor_diagnostic.js:195:      currentRouter: 'unifiedAIService',
backend/src/routes/rag.js:5:const unifiedAIService = require('../services/unifiedAIService');
backend/src/routes/rag.js:12:    return await unifiedAIService.generateRAGResponse(query, context, filters, apiKey);
backend/src/routes/rag.js:24:    return await unifiedAIService.generateKnowledgeSources(apiKey);
backend/src/routes/rag.js:27:    return unifiedAIService.getStaticKnowledgeSources();

### @google/generative-ai usage:
No @google/generative-ai found

### OpenAI SDK usage:
backend/node_modules/openai/beta/realtime/internal-base.js:24:            const error = new OpenAIRealtimeError(message +
backend/node_modules/openai/beta/realtime/internal-base.js:31:        const error = new OpenAIRealtimeError(message, event);
backend/node_modules/openai/beta/realtime/ws.mjs:7:        client ?? (client = new OpenAI());
backend/node_modules/openai/beta/realtime/ws.mjs:47:        return new OpenAIRealtimeWS({ model: deploymentName, options: { headers: await getAzureHeaders(client) } }, client);
backend/node_modules/openai/beta/realtime/internal-base.mjs:18:            const error = new OpenAIRealtimeError(message +
backend/node_modules/openai/beta/realtime/internal-base.mjs:25:        const error = new OpenAIRealtimeError(message, event);
backend/node_modules/openai/beta/realtime/websocket.mjs:12:            throw new OpenAIError("It looks like you're running in a browser-like environment.\n\nThis is disabled by default, as it risks exposing your secret API credentials to attackers.\n\nYou can avoid this error by creating an ephemeral session token:\nhttps://platform.openai.com/docs/api-reference/realtime-sessions\n");
backend/node_modules/openai/beta/realtime/websocket.mjs:14:        client ?? (client = new OpenAI({ dangerouslyAllowBrowser }));
backend/node_modules/openai/beta/realtime/websocket.mjs:76:        return new OpenAIRealtimeWebSocket({
backend/node_modules/openai/beta/realtime/websocket.js:79:        return new OpenAIRealtimeWebSocket({
backend/node_modules/openai/beta/realtime/ws.js:51:        return new OpenAIRealtimeWS({ model: deploymentName, options: { headers: await getAzureHeaders(client) } }, client);
backend/node_modules/openai/client.js:86:            throw new Errors.OpenAIError("The OPENAI_API_KEY environment variable is missing or empty; either provide it, or instantiate the OpenAI client with an apiKey option, like new OpenAI({ apiKey: 'My API Key' }).");
backend/node_modules/openai/client.js:97:            throw new Errors.OpenAIError("It looks like you're running in a browser-like environment.\n\nThis is disabled by default, as it risks exposing your secret API credentials to attackers.\nIf you understand the risks and have appropriate mitigations in place,\nyou can set the `dangerouslyAllowBrowser` option to `true`, e.g.,\n\nnew OpenAI({ apiKey, dangerouslyAllowBrowser: true });\n\nhttps://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety\n");
backend/node_modules/openai/core/pagination.mjs:25:            throw new OpenAIError('No next page expected; please check `.hasNextPage()` before calling `.getNextPage()`.');
backend/node_modules/openai/core/streaming.mjs:23:                throw new OpenAIError('Cannot iterate over a consumed stream, use `.tee()` to split the stream.');
backend/node_modules/openai/core/streaming.mjs:103:                throw new OpenAIError('Cannot iterate over a consumed stream, use `.tee()` to split the stream.');
backend/node_modules/openai/core/streaming.mjs:193:            throw new OpenAIError(`The default react-native fetch implementation does not support streaming. Please use expo/fetch: https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api`);
backend/node_modules/openai/core/streaming.mjs:195:        throw new OpenAIError(`Attempted to iterate over a response with no body`);
backend/node_modules/openai/internal/utils/base64.mjs:16:    throw new OpenAIError('Cannot generate base64 string; Expected `Buffer` or `btoa` to be defined');
backend/node_modules/openai/internal/utils/base64.mjs:31:    throw new OpenAIError('Cannot decode base64 string; Expected `Buffer` or `atob` to be defined');
backend/node_modules/openai/internal/utils/values.mjs:34:        throw new OpenAIError(`Expected a value to be given but received ${value} instead.`);
backend/node_modules/openai/internal/utils/values.mjs:40:        throw new OpenAIError(`${name} must be an integer`);
backend/node_modules/openai/internal/utils/values.mjs:43:        throw new OpenAIError(`${name} must be a positive integer`);
backend/node_modules/openai/internal/utils/values.mjs:52:    throw new OpenAIError(`Could not coerce ${value} (type: ${typeof value}) into a number`);
backend/node_modules/openai/internal/utils/values.mjs:59:    throw new OpenAIError(`Could not coerce ${value} (type: ${typeof value}) into a number`);
backend/node_modules/openai/internal/utils/path.mjs:64:        throw new OpenAIError(`Path parameters result in path with invalid segments:\n${invalidSegments
backend/node_modules/openai/internal/shims.mjs:6:    throw new Error('`fetch` is not defined as a global; Either pass `fetch` to the client, `new OpenAI({ fetch })` or polyfill the global, `globalThis.fetch = fetch`');
backend/node_modules/openai/internal/shims.js:13:    throw new Error('`fetch` is not defined as a global; Either pass `fetch` to the client, `new OpenAI({ fetch })` or polyfill the global, `globalThis.fetch = fetch`');
backend/node_modules/openai/client.mjs:83:            throw new Errors.OpenAIError("The OPENAI_API_KEY environment variable is missing or empty; either provide it, or instantiate the OpenAI client with an apiKey option, like new OpenAI({ apiKey: 'My API Key' }).");
backend/node_modules/openai/client.mjs:94:            throw new Errors.OpenAIError("It looks like you're running in a browser-like environment.\n\nThis is disabled by default, as it risks exposing your secret API credentials to attackers.\nIf you understand the risks and have appropriate mitigations in place,\nyou can set the `dangerouslyAllowBrowser` option to `true`, e.g.,\n\nnew OpenAI({ apiKey, dangerouslyAllowBrowser: true });\n\nhttps://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety\n");
backend/node_modules/openai/README.md:39:const client = new OpenAI({
backend/node_modules/openai/README.md:57:const client = new OpenAI({
backend/node_modules/openai/README.md:79:const client = new OpenAI();
backend/node_modules/openai/README.md:105:const client = new OpenAI();
backend/node_modules/openai/README.md:143:const client = new OpenAI({
backend/node_modules/openai/README.md:183:const client = new OpenAI({
backend/node_modules/openai/README.md:274:const rt = new OpenAIRealtimeWebSocket({ model: 'gpt-4o-realtime-preview-2024-12-17' });
backend/node_modules/openai/README.md:319:const client = new OpenAI({
backend/node_modules/openai/README.md:336:const client = new OpenAI({
backend/node_modules/openai/README.md:411:const rt = new OpenAIRealtimeWebSocket({ model: 'gpt-4o-realtime-preview-2024-12-17' });
backend/node_modules/openai/README.md:462:const client = new OpenAI();
backend/node_modules/openai/README.md:495:const client = new OpenAI({
backend/node_modules/openai/README.md:526:const client = new OpenAI({
backend/node_modules/openai/README.md:591:const client = new OpenAI({ fetch });
backend/node_modules/openai/README.md:601:const client = new OpenAI({
backend/node_modules/openai/README.md:620:const client = new OpenAI({
backend/node_modules/openai/README.md:632:const client = new OpenAI({
backend/node_modules/openai/README.md:645:const client = new OpenAI({
backend/node_modules/openai/lib/AssistantStream.mjs:331:        throw new OpenAIError(`stream has ended, this shouldn't happen`);
backend/node_modules/openai/lib/AbstractChatCompletionRunner.mjs:51:            throw new OpenAIError('stream ended without producing a ChatCompletion');
backend/node_modules/openai/lib/AbstractChatCompletionRunner.mjs:136:                    throw new OpenAIError('Tool given to `.runTools()` that does not have an associated function');
backend/node_modules/openai/lib/AbstractChatCompletionRunner.mjs:183:                throw new OpenAIError(`missing message in ChatCompletion response`);
backend/node_modules/openai/lib/AbstractChatCompletionRunner.mjs:243:    throw new OpenAIError('stream ended without producing a ChatCompletionMessage with role=assistant');
backend/node_modules/openai/lib/AbstractChatCompletionRunner.mjs:280:        throw new OpenAIError('ChatCompletion convenience helpers only support n=1 at this time. To use n>1, please use chat.completions.create() directly.');
backend/node_modules/openai/lib/ResponsesParser.mjs:139:            throw new OpenAIError(`Currently only \`function\` tool types support auto-parsing; Received \`${tool.type}\``);
backend/node_modules/openai/lib/ResponsesParser.mjs:142:            throw new OpenAIError(`The \`${tool.function.name}\` tool is not marked with \`strict: true\`. Only strict function tools can be auto-parsed`);
backend/node_modules/openai/lib/ChatCompletionStream.mjs:224:            throw new OpenAIError(`stream has ended, this shouldn't happen`);
backend/node_modules/openai/lib/ChatCompletionStream.mjs:228:            throw new OpenAIError(`request ended without sending any chunks`);
backend/node_modules/openai/lib/ChatCompletionStream.mjs:403:                throw new OpenAIError(`missing finish_reason for choice ${index}`);
backend/node_modules/openai/lib/ChatCompletionStream.mjs:408:                throw new OpenAIError(`missing role for choice ${index}`);
backend/node_modules/openai/lib/ChatCompletionStream.mjs:413:                    throw new OpenAIError(`missing function_call.arguments for choice ${index}`);
backend/node_modules/openai/lib/ChatCompletionStream.mjs:416:                    throw new OpenAIError(`missing function_call.name for choice ${index}`);
backend/node_modules/openai/lib/ChatCompletionStream.mjs:446:                                throw new OpenAIError(`missing choices[${index}].tool_calls[${i}].id\n${str(snapshot)}`);
backend/node_modules/openai/lib/ChatCompletionStream.mjs:449:                                throw new OpenAIError(`missing choices[${index}].tool_calls[${i}].type\n${str(snapshot)}`);
backend/node_modules/openai/lib/ChatCompletionStream.mjs:452:                                throw new OpenAIError(`missing choices[${index}].tool_calls[${i}].function.name\n${str(snapshot)}`);
backend/node_modules/openai/lib/ChatCompletionStream.mjs:455:                                throw new OpenAIError(`missing choices[${index}].tool_calls[${i}].function.arguments\n${str(snapshot)}`);
backend/node_modules/openai/lib/responses/ResponseStream.mjs:67:                    throw new OpenAIError(`missing output at index ${event.output_index}`);
backend/node_modules/openai/lib/responses/ResponseStream.mjs:72:                        throw new OpenAIError(`missing content at index ${event.content_index}`);
backend/node_modules/openai/lib/responses/ResponseStream.mjs:75:                        throw new OpenAIError(`expected content to be 'output_text', got ${content.type}`);
backend/node_modules/openai/lib/responses/ResponseStream.mjs:87:                    throw new OpenAIError(`missing output at index ${event.output_index}`);
backend/node_modules/openai/lib/responses/ResponseStream.mjs:103:            throw new OpenAIError(`stream has ended, this shouldn't happen`);
backend/node_modules/openai/lib/responses/ResponseStream.mjs:107:            throw new OpenAIError(`request ended without sending any events`);
backend/node_modules/openai/lib/responses/ResponseStream.mjs:117:                throw new OpenAIError(`When snapshot hasn't been set yet, expected 'response.created' event, got ${event.type}`);
backend/node_modules/openai/lib/responses/ResponseStream.mjs:130:                    throw new OpenAIError(`missing output at index ${event.output_index}`);
backend/node_modules/openai/lib/responses/ResponseStream.mjs:140:                    throw new OpenAIError(`missing output at index ${event.output_index}`);
backend/node_modules/openai/lib/responses/ResponseStream.mjs:145:                        throw new OpenAIError(`missing content at index ${event.content_index}`);
backend/node_modules/openai/lib/responses/ResponseStream.mjs:148:                        throw new OpenAIError(`expected content to be 'output_text', got ${content.type}`);
backend/node_modules/openai/lib/responses/ResponseStream.mjs:157:                    throw new OpenAIError(`missing output at index ${event.output_index}`);
backend/node_modules/openai/lib/responses/ResponseStream.mjs:229:            throw new OpenAIError('stream ended without producing a ChatCompletion');
backend/node_modules/openai/lib/parser.mjs:148:            throw new OpenAIError(`Currently only \`function\` tool calls are supported; Received \`${toolCall.type}\``);
backend/node_modules/openai/lib/parser.mjs:155:            throw new OpenAIError(`Currently only \`function\` tool types support auto-parsing; Received \`${tool.type}\``);
backend/node_modules/openai/lib/parser.mjs:158:            throw new OpenAIError(`The \`${tool.function.name}\` tool is not marked with \`strict: true\`. Only strict function tools can be auto-parsed`);
backend/node_modules/openai/lib/EventStream.mjs:179:        const openAIError = new OpenAIError(error.message);
backend/node_modules/openai/lib/EventStream.mjs:184:    return this._emit('error', new OpenAIError(String(error)));
backend/node_modules/openai/src/beta/realtime/websocket.ts:45:      throw new OpenAIError(
backend/node_modules/openai/src/beta/realtime/websocket.ts:50:    client ??= new OpenAI({ dangerouslyAllowBrowser });
backend/node_modules/openai/src/beta/realtime/websocket.ts:118:    return new OpenAIRealtimeWebSocket(
backend/node_modules/openai/src/beta/realtime/ws.ts:15:    client ??= new OpenAI();
backend/node_modules/openai/src/beta/realtime/ws.ts:62:    return new OpenAIRealtimeWS(
backend/node_modules/openai/src/beta/realtime/internal-base.ts:58:      const error = new OpenAIRealtimeError(
backend/node_modules/openai/src/beta/realtime/internal-base.ts:69:    const error = new OpenAIRealtimeError(message, event);
backend/node_modules/openai/src/core/streaming.ts:44:        throw new OpenAIError('Cannot iterate over a consumed stream, use `.tee()` to split the stream.');
backend/node_modules/openai/src/core/streaming.ts:131:        throw new OpenAIError('Cannot iterate over a consumed stream, use `.tee()` to split the stream.');
backend/node_modules/openai/src/core/streaming.ts:228:      throw new OpenAIError(
backend/node_modules/openai/src/core/streaming.ts:232:    throw new OpenAIError(`Attempted to iterate over a response with no body`);
backend/node_modules/openai/src/core/pagination.ts:40:      throw new OpenAIError(
backend/node_modules/openai/src/internal/shims.ts:19:    '`fetch` is not defined as a global; Either pass `fetch` to the client, `new OpenAI({ fetch })` or polyfill the global, `globalThis.fetch = fetch`',
backend/node_modules/openai/src/internal/utils/path.ts:75:      throw new OpenAIError(
backend/node_modules/openai/src/internal/utils/values.ts:42:    throw new OpenAIError(`Expected a value to be given but received ${value} instead.`);
backend/node_modules/openai/src/internal/utils/values.ts:50:    throw new OpenAIError(`${name} must be an integer`);
backend/node_modules/openai/src/internal/utils/values.ts:53:    throw new OpenAIError(`${name} must be a positive integer`);
backend/node_modules/openai/src/internal/utils/values.ts:62:  throw new OpenAIError(`Could not coerce ${value} (type: ${typeof value}) into a number`);
backend/node_modules/openai/src/internal/utils/values.ts:69:  throw new OpenAIError(`Could not coerce ${value} (type: ${typeof value}) into a number`);
backend/node_modules/openai/src/internal/utils/base64.ts:21:  throw new OpenAIError('Cannot generate base64 string; Expected `Buffer` or `btoa` to be defined');
backend/node_modules/openai/src/internal/utils/base64.ts:39:  throw new OpenAIError('Cannot decode base64 string; Expected `Buffer` or `atob` to be defined');
backend/node_modules/openai/src/client.ts:344:        "The OPENAI_API_KEY environment variable is missing or empty; either provide it, or instantiate the OpenAI client with an apiKey option, like new OpenAI({ apiKey: 'My API Key' }).",
backend/node_modules/openai/src/client.ts:359:        "It looks like you're running in a browser-like environment.\n\nThis is disabled by default, as it risks exposing your secret API credentials to attackers.\nIf you understand the risks and have appropriate mitigations in place,\nyou can set the `dangerouslyAllowBrowser` option to `true`, e.g.,\n\nnew OpenAI({ apiKey, dangerouslyAllowBrowser: true });\n\nhttps://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety\n",
backend/node_modules/openai/src/lib/AbstractChatCompletionRunner.ts:81:    if (!completion) throw new OpenAIError('stream ended without producing a ChatCompletion');
backend/node_modules/openai/src/lib/AbstractChatCompletionRunner.ts:112:    throw new OpenAIError('stream ended without producing a ChatCompletionMessage with role=assistant');
backend/node_modules/openai/src/lib/AbstractChatCompletionRunner.ts:217:      throw new OpenAIError(
backend/node_modules/openai/src/lib/AbstractChatCompletionRunner.ts:271:          throw new OpenAIError('Tool given to `.runTools()` that does not have an associated function');
backend/node_modules/openai/src/lib/AbstractChatCompletionRunner.ts:331:        throw new OpenAIError(`missing message in ChatCompletion response`);
backend/node_modules/openai/src/lib/responses/ResponseStream.ts:113:          throw new OpenAIError(`missing output at index ${event.output_index}`);
backend/node_modules/openai/src/lib/responses/ResponseStream.ts:118:            throw new OpenAIError(`missing content at index ${event.content_index}`);
backend/node_modules/openai/src/lib/responses/ResponseStream.ts:121:            throw new OpenAIError(`expected content to be 'output_text', got ${content.type}`);
backend/node_modules/openai/src/lib/responses/ResponseStream.ts:134:          throw new OpenAIError(`missing output at index ${event.output_index}`);
backend/node_modules/openai/src/lib/responses/ResponseStream.ts:152:      throw new OpenAIError(`stream has ended, this shouldn't happen`);
backend/node_modules/openai/src/lib/responses/ResponseStream.ts:156:      throw new OpenAIError(`request ended without sending any events`);
backend/node_modules/openai/src/lib/responses/ResponseStream.ts:207:        throw new OpenAIError(
backend/node_modules/openai/src/lib/responses/ResponseStream.ts:223:          throw new OpenAIError(`missing output at index ${event.output_index}`);
backend/node_modules/openai/src/lib/responses/ResponseStream.ts:233:          throw new OpenAIError(`missing output at index ${event.output_index}`);
backend/node_modules/openai/src/lib/responses/ResponseStream.ts:238:            throw new OpenAIError(`missing content at index ${event.content_index}`);
backend/node_modules/openai/src/lib/responses/ResponseStream.ts:241:            throw new OpenAIError(`expected content to be 'output_text', got ${content.type}`);
backend/node_modules/openai/src/lib/responses/ResponseStream.ts:250:          throw new OpenAIError(`missing output at index ${event.output_index}`);
backend/node_modules/openai/src/lib/responses/ResponseStream.ts:334:    if (!response) throw new OpenAIError('stream ended without producing a ChatCompletion');
backend/node_modules/openai/src/lib/EventStream.ts:159:      const openAIError: OpenAIError = new OpenAIError(error.message);
backend/node_modules/openai/src/lib/EventStream.ts:164:    return this._emit('error', new OpenAIError(String(error)));
backend/node_modules/openai/src/lib/AssistantStream.ts:409:      throw new OpenAIError(`stream has ended, this shouldn't happen`);
backend/node_modules/openai/src/lib/ResponsesParser.ts:237:      throw new OpenAIError(
backend/node_modules/openai/src/lib/ResponsesParser.ts:243:      throw new OpenAIError(
backend/node_modules/openai/src/lib/parser.ts:290:      throw new OpenAIError(
backend/node_modules/openai/src/lib/parser.ts:300:      throw new OpenAIError(
backend/node_modules/openai/src/lib/parser.ts:306:      throw new OpenAIError(
backend/node_modules/openai/src/lib/ChatCompletionStream.ts:359:      throw new OpenAIError(`stream has ended, this shouldn't happen`);
backend/node_modules/openai/src/lib/ChatCompletionStream.ts:363:      throw new OpenAIError(`request ended without sending any chunks`);
backend/node_modules/openai/src/lib/ChatCompletionStream.ts:620:          throw new OpenAIError(`missing finish_reason for choice ${index}`);
backend/node_modules/openai/src/lib/ChatCompletionStream.ts:626:          throw new OpenAIError(`missing role for choice ${index}`);
backend/node_modules/openai/src/lib/ChatCompletionStream.ts:632:            throw new OpenAIError(`missing function_call.arguments for choice ${index}`);
backend/node_modules/openai/src/lib/ChatCompletionStream.ts:636:            throw new OpenAIError(`missing function_call.name for choice ${index}`);
backend/node_modules/openai/src/lib/ChatCompletionStream.ts:668:                  throw new OpenAIError(`missing choices[${index}].tool_calls[${i}].id\n${str(snapshot)}`);
backend/node_modules/openai/src/lib/ChatCompletionStream.ts:671:                  throw new OpenAIError(`missing choices[${index}].tool_calls[${i}].type\n${str(snapshot)}`);
backend/node_modules/openai/src/lib/ChatCompletionStream.ts:674:                  throw new OpenAIError(
backend/node_modules/openai/src/lib/ChatCompletionStream.ts:679:                  throw new OpenAIError(
backend/coverage/lcov-report/controllers/aiTranscriptController.js.html:2035:<span class="cstat-no" title="statement not covered" >      this.openaiClient = new OpenAI({</span>
backend/coverage/controllers/aiTranscriptController.js.html:2035:<span class="cstat-no" title="statement not covered" >      this.openaiClient = new OpenAI({</span>
backend/src/controllers/aiTranscriptController.js:180:      this.openaiClient = new OpenAI({
No new OpenAI found

### Actual OpenAI instantiation in source:
backend/src/controllers/aiTranscriptController.js:180:      this.openaiClient = new OpenAI({
No new OpenAI in source code found

### /api/chat routes:
No /api/chat routes found

### /api/messages routes:
No /api/messages routes found

## Current Express Routes Registered:
- /api/transcript
- /api/courses
- /api/planner
- /api/auth
- /api/settings
- /api/advisor
- /api/rag
- /api/migration
- /api/admin

## Current Environment Configuration:
- API_GATEWAY_URL=http://127.0.0.1:8001
- DISABLE_UNIFIED_AI_SERVICE=1
- FORCE_STRUCTURED_QA=1

## Issues Found:
1. **CRITICAL**: Legacy fallback path in advisor.js:121-146 bypasses structured enforcement
2. Multiple unifiedAIService imports still present
3. OpenAI instantiation in aiTranscriptController.js:180
4. Need frontend helper to prevent direct provider calls
