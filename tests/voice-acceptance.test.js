import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoiceAcceptance, VOICE_TRIAL_PHRASES, VOICE_TRIAL_CHECKS } from '../src/voice-acceptance.js';

const environment = { pc: 'PC de prueba / Linux', browser: 'Navegador de prueba', microphone: 'Fixture', noise: 'Simulado' };
function fixture() { const trial = createVoiceAcceptance({ timestamp: () => '2026-10-10T12:00:00.000Z' }); trial.start(environment); return trial; }
function sample(trial, index, useful = true) {
  const captureId = `capture-${index}`;
  assert.equal(trial.beginCapture(captureId), true);
  assert.equal(trial.record(VOICE_TRIAL_PHRASES[index], { captureId, elapsedMs: 2500, durationMs: 3100, releaseToTextMs: 2700 }), true);
  assert.equal(trial.rate(useful), true);
}

test('ocho frases útiles no alcanzan 8/10 hasta completar diez valoraciones humanas', () => {
  const trial = fixture();
  for (let i = 0; i < 8; i++) sample(trial, i);
  assert.equal(trial.exportReport().summary.semanticThresholdMet, false);
  assert.equal(trial.exportReport().summary.complete, false);
  sample(trial, 8, false); sample(trial, 9, false);
  const report = trial.exportReport();
  assert.equal(report.summary.semanticThresholdMet, true);
  assert.equal(report.summary.useful, 8); assert.equal(trial.snapshot().active, false);
  assert.equal(report.summary.checksPassed, 0); assert.equal(report.summary.reviewRequired, true);
  assert.equal(report.evidenceKind, 'human-microphone-self-report');
  assert.equal(trial.beginCapture('eleventh'), false);
});

test('una muestra necesita valoración y conserva texto original aislado del borrador y de la exportación', () => {
  const trial = fixture(); trial.beginCapture('first');
  assert.equal(trial.record('Texto original con error.', { captureId: 'first', elapsedMs: 42, durationMs: 1800, releaseToTextMs: 81 }), true);
  assert.equal(trial.beginCapture('duplicate'), false);
  assert.equal(trial.record('Sustitución tardía.', { captureId: 'first' }), false);
  assert.equal(trial.exportReport().summary.rated, 0);
  const pending = trial.snapshot(); pending.pending.originalText = 'Texto corregido.';
  assert.equal(trial.rate(true), true);
  const report = trial.exportReport();
  assert.equal(report.results[0].captureId, 'first');
  assert.equal(report.results[0].originalText, 'Texto original con error.');
  assert.equal(report.results[0].releaseToTextMs, 81);
  report.results[0].originalText = 'Mutación externa';
  assert.equal(trial.exportReport().results[0].originalText, 'Texto original con error.');
});

test('cancelar, detener y reiniciar un ensayo impide atribuir una captura antigua a otra frase', () => {
  const trial = fixture(); trial.beginCapture('old'); trial.cancelCapture('Cancelación de prueba.');
  assert.equal(trial.exportReport().interruptions[0].captureId, 'old');
  trial.beginCapture('new');
  assert.equal(trial.record('Resultado antiguo', { captureId: 'old' }), false);
  assert.equal(trial.snapshot().pending, undefined);
  assert.equal(trial.record('Resultado vigente', { captureId: 'new' }), true);
  trial.stop();
  assert.equal(trial.exportReport().unratedSample.originalText, 'Resultado vigente');
  assert.equal(trial.exportReport().summary.complete, false);
  trial.start(environment); trial.beginCapture('next-run');
  assert.equal(trial.record('Resultado vigente', { captureId: 'new' }), false);
  assert.equal(trial.exportReport().results.length, 0);
});

test('fallo sin transcripción nunca puede valorarse como útil ni superar la meta', () => {
  const trial = fixture(); trial.beginCapture('denied'); trial.fail('Permiso denegado.');
  assert.equal(trial.rate(true), false); assert.equal(trial.rate(false), true);
  for (let i = 1; i < 10; i++) sample(trial, i, i < 8);
  const report = trial.exportReport();
  assert.equal(report.results[0].captureId, 'denied');
  assert.equal(report.results[0].originalText, ''); assert.equal(report.results[0].error, 'Permiso denegado.');
  assert.equal(report.summary.useful, 7); assert.equal(report.summary.semanticThresholdMet, false);
});

test('las comprobaciones no se infieren de las frases y los datos incompletos no crean evidencia', () => {
  const trial = createVoiceAcceptance();
  assert.throws(() => trial.start({ ...environment, microphone: '' }), /Completa/);
  assert.throws(() => trial.exportReport(), /Comienza/);
  trial.start(environment);
  assert.throws(() => trial.start(environment), /Termina/);
  assert.equal(trial.setCheck('unknown', 'pass'), false);
  assert.equal(trial.setCheck('permission', 'guessed'), false);
  for (const [key] of VOICE_TRIAL_CHECKS) trial.setCheck(key, 'pass');
  assert.equal(trial.exportReport().summary.checksPassed, VOICE_TRIAL_CHECKS.length);
  assert.equal(trial.exportReport().summary.semanticThresholdMet, false);
  trial.beginCapture('metrics'); trial.record('Una frase.', { captureId: 'metrics', elapsedMs: -1, durationMs: NaN });
  assert.equal(trial.snapshot().pending.sttMs, null); assert.equal(trial.snapshot().pending.durationMs, null);
});
