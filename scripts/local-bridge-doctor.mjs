#!/usr/bin/env node
import { parseDoctorArguments } from '../src/runtime/local-bridge/host/installer/doctor-cli.js';
import { createRegistrationPlan } from '../src/runtime/local-bridge/host/installer/registration-plan.js';
import { inspectNativeHostInstallation } from '../src/runtime/local-bridge/host/installer/native-host-doctor.js';

try {
  const options = parseDoctorArguments(process.argv.slice(2));
  const plan = createRegistrationPlan(options);
  const result = await inspectNativeHostInstallation({
    plan,
    configPath: options.configPath,
  });
  process.stdout.write(`${JSON.stringify({ plan, result }, null, 2)}\n`);
  if (!result.ok) process.exitCode = 1;
} catch (error) {
  process.stdout.write(`${JSON.stringify({
    ok: false,
    error: {
      code: typeof error?.code === 'string' ? error.code : 'DOCTOR_FAILED',
      message: typeof error?.message === 'string'
        ? error.message.slice(0, 1000)
        : 'Doctor failed.',
    },
  }, null, 2)}\n`);
  process.exitCode = 1;
}
