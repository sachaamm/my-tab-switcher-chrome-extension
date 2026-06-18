import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TabMru } from '../src/mru.js';

test('recordActivation met le dernier onglet activé en tête', () => {
  const mru = new TabMru();
  mru.recordActivation(1, 10);
  mru.recordActivation(1, 11);
  mru.recordActivation(1, 12);
  // L'onglet courant (12) est en tête, le précédent est 11.
  assert.equal(mru.previous(1), 11);
});

test('recordActivation déplace un onglet déjà connu en tête (pas de doublon)', () => {
  const mru = new TabMru();
  mru.recordActivation(1, 10);
  mru.recordActivation(1, 11);
  mru.recordActivation(1, 10); // réactivation de 10
  // Ordre récence : [10, 11]. previous => 11.
  assert.equal(mru.previous(1), 11);
  // Plus rien au-delà.
  assert.equal(mru.previous(1), null);
});

test('previous recule dans la pile, next avance', () => {
  const mru = new TabMru();
  mru.recordActivation(1, 10);
  mru.recordActivation(1, 11);
  mru.recordActivation(1, 12); // pile: [12, 11, 10], curseur 0
  assert.equal(mru.previous(1), 11); // curseur 1
  assert.equal(mru.previous(1), 10); // curseur 2
  assert.equal(mru.previous(1), null); // borne basse atteinte
  assert.equal(mru.next(1), 11); // curseur 1
  assert.equal(mru.next(1), 12); // curseur 0
  assert.equal(mru.next(1), null); // borne haute atteinte
});

test('une activation manuelle pendant la navigation réinitialise le curseur', () => {
  const mru = new TabMru();
  mru.recordActivation(1, 10);
  mru.recordActivation(1, 11);
  mru.recordActivation(1, 12);
  mru.previous(1); // curseur 1 (sur 11)
  mru.previous(1); // curseur 2 (sur 10)
  // L'utilisateur clique manuellement sur l'onglet 11.
  mru.recordActivation(1, 11);
  // Pile: [11, 12, 10], curseur 0. previous => 12.
  assert.equal(mru.previous(1), 12);
});

test('les fenêtres ont des historiques indépendants', () => {
  const mru = new TabMru();
  mru.recordActivation(1, 10);
  mru.recordActivation(1, 11);
  mru.recordActivation(2, 20);
  mru.recordActivation(2, 21);
  assert.equal(mru.previous(1), 10);
  assert.equal(mru.previous(2), 20);
});

test('previous/next sur une fenêtre inconnue renvoie null', () => {
  const mru = new TabMru();
  assert.equal(mru.previous(99), null);
  assert.equal(mru.next(99), null);
});

test('removeTab retire l’onglet et corrige le curseur', () => {
  const mru = new TabMru();
  mru.recordActivation(1, 10);
  mru.recordActivation(1, 11);
  mru.recordActivation(1, 12); // [12, 11, 10] curseur 0
  mru.previous(1); // curseur 1 (sur 11)
  mru.removeTab(1, 12); // on retire 12 (avant le curseur) -> pile [11, 10], curseur 0
  // On est sur 11 (curseur 0), previous => 10.
  assert.equal(mru.previous(1), 10);
});

test('removeTab du dernier onglet purge la fenêtre', () => {
  const mru = new TabMru();
  mru.recordActivation(1, 10);
  mru.removeTab(1, 10);
  assert.equal(mru.previous(1), null);
  assert.equal(mru.next(1), null);
});

test('removeWindow purge tout l’historique de la fenêtre', () => {
  const mru = new TabMru();
  mru.recordActivation(1, 10);
  mru.recordActivation(1, 11);
  mru.removeWindow(1);
  assert.equal(mru.previous(1), null);
});

test('serialize/restore conserve l’état (round-trip)', () => {
  const mru = new TabMru();
  mru.recordActivation(1, 10);
  mru.recordActivation(1, 11);
  mru.recordActivation(1, 12);
  mru.previous(1); // curseur 1
  const data = JSON.parse(JSON.stringify(mru.serialize()));
  const restored = TabMru.restore(data);
  // Le curseur est sur 11 ; next => 12, previous => 10.
  assert.equal(restored.next(1), 12);
  assert.equal(restored.previous(1), 11);
  assert.equal(restored.previous(1), 10);
});
