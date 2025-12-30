# Contributing

## Development Setup

```bash
# Install dependencies for both services
npm install

# Server
cd server && npm install && npm run build
cd agent && npm install && npm run build
```

## Running Tests

The test script verifies crash recovery and fault tolerance:

```bash
# Ensure services are running
docker compose up -d

# Run test suite
bash test_scenarios.sh
```

## Code Style

This project uses ESLint and Prettier:

```bash
npm run lint
npm run format
```

## Adding New Command Types

1. Add the type to `server/src/types/index.ts`
2. Create executor in `agent/src/executors/yourExecutor.ts`
3. Wire it up in `agent/src/executors/index.ts`
4. Add validation schema in `server/src/services/commandService.ts`

Example:
```typescript
// agent/src/executors/mathExecutor.ts
export async function executeMath(payload: MathPayload): Promise<ExecutionResult> {
  const result = payload.a + payload.b;
  return { success: true, result: { sum: result } };
}
```
