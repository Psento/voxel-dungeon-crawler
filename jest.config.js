module.exports = {
    // Automatically clear mock calls and instances between every test
    clearMocks: true,
  
    // The directory where Jest should output its coverage files
    coverageDirectory: "coverage",
  
    // Test environment
    testEnvironment: "node",
  
    // Test match pattern
    testMatch: [
      "**/tests/**/*.test.js"
    ],
  
    // Time in milliseconds after which a test is considered slow
    slowTestThreshold: 5,
  
    // Mock setup file
    setupFiles: ["./tests/setup.js"]
  };