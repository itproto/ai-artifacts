#!/usr/bin/env bun
import { VERSION } from '../version.ts'

// Fast-path: --version with zero module loading
if (process.argv[2] === '--version' || process.argv[2] === '-V') {
	console.log(VERSION)
	process.exit(0)
}

const { buildProgram } = await import('../commands/registry.ts')
const program = buildProgram()
program.parse()
