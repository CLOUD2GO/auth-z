import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
    testMatch: ['<rootDir>/tests/**/*.test.ts'],
    transformIgnorePatterns: [],
    moduleFileExtensions: [
        'js',
        'mjs',
        'cjs',
        'jsx',
        'ts',
        'tsx',
        'json',
        'node',
        'd.ts'
    ],
    extensionsToTreatAsEsm: ['.ts'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
    },
    transform: {
        '^.+\\.(j|t)sx?$': [
            'ts-jest',
            {
                useESM: true,
                tsconfig: './tsconfig.json'
            }
        ]
    }
};

export default config;
