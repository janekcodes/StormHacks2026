import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
      'seed/**'
    ]
  },
  tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error'
    }
  }
)
