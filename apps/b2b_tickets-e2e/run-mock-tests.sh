#!/bin/bash

echo "Running mock tests only..."

# Run only the mock test file and example test (which doesn't depend on real server)
USE_MOCK_DATA=1 npx playwright test tests/mock-test.spec.ts tests/example.spec.ts --reporter=list
exit_code=$?

# Check the exit code
if [ $exit_code -eq 0 ]; then
  echo "✅ All mock tests passed!"
else
  echo "❌ Some mock tests failed. Check the HTML report for details."
  echo "To view the report, run: npx playwright show-report"
fi

exit $exit_code