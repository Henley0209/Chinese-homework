import test from 'node:test';
import assert from 'node:assert/strict';
import {createSilenceGate} from '../conversation-silence.mjs';
test('no automatic submission before sustained speech',()=>{const gate=createSilenceGate();for(let t=0;t<10000;t+=50)assert.equal(gate.push(.001,t).finished,false);assert.equal(gate.push(.1,10000).heard,false);assert.equal(gate.push(.001,10050).heard,false);});
test('exactly three seconds of silence after speech, with continuation resetting pause',()=>{const gate=createSilenceGate();for(let t=0;t<=300;t+=50)gate.push(.06,t);assert.equal(gate.push(0,3299).finished,false);gate.push(.06,3300);assert.equal(gate.push(0,6299).finished,false);assert.equal(gate.push(0,6300).finished,true);});
