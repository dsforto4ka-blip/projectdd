import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: ['dist/**/*', 'docs/**/*', 'node_modules/**/*', 'functions/**/*'],
  },
  firebaseRulesPlugin.configs['flat/recommended'],
];
