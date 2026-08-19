import { NARRATOR_CATEGORY, line, type NarratorLine } from './shared.ts';

const C = NARRATOR_CATEGORY;

/**
 * Portuguese (BR) arcade bank. Same ids as EN.
 * Oral gíria RJ/SP — do not "correct" to norma culta. Speak field is the TTS take.
 */
export const PT_BR_NARRATOR_LINES: readonly NarratorLine[] = [
  // --- largada ---
  line('engines-hot', 'MOTORES QUENTES... VAMO QUE VAMO!', 'MOTORES QUENTESS—VAMO QUE VAMOOO!', C.RACE_START),
  line('crank-it-up-live', 'SOBE O SOM!!!!  A CORRIDA TA ON!!!!', 'SOBE O SOM—A CORRIDA TA ONNN!!!', C.RACE_START),
  line('burn-rubber', 'QUEIMA PNEU, …QUEIMA PNEU….  METE BARULHO!', 'QUEIMA PNEUU—QUEIMA PNEUU—METE BARULHOOO!', C.RACE_START),
  line('no-brakes', 'METE MARCHA, PORRA! A PISTA E NOSSA!', 'METE MARCHA, PORRAA—A PISTA E NOSSSA!', C.RACE_START),
  line('turn-it-up', 'SOBE O SOM... E DESTROI TUDO!', 'SOBE O SOM—E DESTROI TUDOOO!', C.RACE_START),
  line('get-on-fire', 'PEGA FOGOOOOOO!', 'PEGA FOGOOOOOO!', C.RACE_START),

  // --- dano ---
  line('ready-to-explode', 'ESSE CARRO TA PRA EXPLODIR!', 'ESSE CARRO TA PRA EXPLODIRRR!', C.DAMAGE),
  line('one-more-hit', 'MAIS UMA PORRADA... E JA ERA!', 'MAIS UMA PORRADA—E JA ERRAA!', C.DAMAGE),
  line('owww-hurt', 'AI PORRA! ISSO VAI DOER!', 'AI PORRAA—ISSO VAI DOERRR!', C.DAMAGE),
  line('ouch-oh-man', 'AI CARALHO!…. OH MANO!', 'AI CARALHOO—OH MANOOO!', C.DAMAGE),
  line('cu-travou', 'NOOOOSA, O CU ATE TRAVOU, BAGACA', 'NOOOOSA—O CU ATE TRAVOU, BAGACAA!', C.DAMAGE, 3),

  // --- turbo ---
  line('boost-engaged', 'BOOST PEGOU... SEGURA!', 'BOOST PEGOU—SEGURAA!', C.BOOST),
  line('turbo-lit', 'TURBO PEGOU, VEI! SEGURA ESSA!', 'TURBO PEGOU, VEI—SEGURA ESSSA!', C.BOOST),
  line('juiced-up', 'TA TURBINADO E PRONTO!', 'TA TURBINADO E PRONTOOO!', C.BOOST),
  line('powers-up', 'POTENCIA NO TALO! VAMO!', 'POTENCIA NO TALO—VAMOOO!', C.BOOST),

  // --- banter / catchphrases ---
  line('lok-thant-enzo', 'LOQUE TAN BRUNO!', 'LOQUE TAN BRUUNNO!', C.BANTER, 3),
  line('holy-chimbeler', 'SANTO THANNER!!!', 'SANTO THANNNERRR!!!', C.BANTER, 3),
  line('chimbeeler', 'THANNEERRR!!!', 'THANNEERRR!!!', C.BANTER, 3),
  line('porra-bruno-pronto', 'PORRA BRUNO, TEM DE TA PRONTO!', 'PORRA BRUNO—TEM DE TA PRONTOOO!', C.BANTER, 3),
  line('thanner-roadmap', 'THANNER, ROADMAP! ROADMAP!', 'THANNER—ROADMAAAP! ROADMAAAP!', C.BANTER, 3),
  line('caraio-thanner-vasco', 'CARAIO THANNER, TA PIOR QUE O VASCO ESSE AI', 'CARAIO THANNER—TA PIOR QUE O VAAASCO ESSE AI!', C.BANTER, 3),
  line('oxente-doido', 'OXENTEEE, QUE QUE ESSE DOIDO QUER???', 'OXENTEEEE—QUE QUE ESSE DOIDO QUERRR???', C.BANTER, 3),
  line('puta-merda-passou', 'PUTA MERDA, PASSOU FALANDO', 'PUTA MERDAA—PASSOU FALANDOOO!', C.BANTER, 3),
  line('what-just-happened', 'QUE QUE FOI ISSO?!', 'QUE QUE FOI ISSOOO?!', C.BANTER),
  line('that-was-insane', 'ISSO FOI INSANO!', 'ISSO FOI INSAANO!', C.BANTER),
  line('call-a-mechanic', 'CHAMA O MECANICO, PORRA!', 'CHAMA O MECANICO, PORRAA!', C.BANTER),
  line('leave-a-mark', 'ISSO VAI DEIXAR MARCA!', 'ISSO VAI DEIXAR MARCAA!', C.BANTER),
  line('ouchhhh', 'Aiii caralho?', 'AIIII CARALHOO?', C.BANTER),
  line('wrong-way', 'CONTRAMAOOO!', 'CONTRAMAOOO—VIRA ESSA PORRAA!!!', C.BANTER),
  line('boooom', 'BOOOOOM!', 'BOOOOOOM!', C.BANTER),
  line('boom-new-leader', 'BOOM! LIDER NOVO!', 'BOOM—LIDER NOVOOO!', C.BANTER),
  line('this-guy-crazy', 'ESSE CARA E DOIDO, MANO!', 'ESSE CARA E DOIDO, MANOOO!', C.BANTER),
  line('gone-way-out', 'FOI EMBORA! LA NA FRENTE!', 'FOI EMBORAA—LA NA FRENTEE!', C.BANTER),

  // --- atrasado ---
  line('lost-the-map', 'ALGUEM PERDEU O MAPA DA CORRIDA!', 'ALGUEM PERDEU O MAPA DA CORRIDAA!', C.BEHIND),
  line('hello-up-here', 'OIEE? A CORRIDA TA LA NA FRENTE!', 'OIEEE—A CORRIDA TA LA NA FRENTEE!', C.BEHIND),

  // --- armas ---
  line('boom-direct-hit', 'BOOOOM! ACERTOU EM CHEIO!', 'BOOOM—ACERTOU EM CHEIOOO!!!', C.WEAPONS),
  line('nailed-it', 'TOMA! COMEU NA FRENTE!', 'TOMAA—COMEU NA FRENTEE!', C.WEAPONS),
  line('here-comes-heat', 'LA VEM FOGO, VEI!', 'LA VEM FOGO, VEIII!', C.WEAPONS),
  line('brings-the-fire', 'TRAZ O FOOOGO!', 'TRAZ O FOOOOGO!', C.WEAPONS),
  line('total-wipeout', 'LIMPOU GERAL!', 'LIMPOU GERAAL!', C.WEAPONS),
  line('eita-porrada', 'EITA PORRADA FORTE.....', 'EITA PORRAAAADA FORTEEE!', C.WEAPONS, 3),

  // --- ultima volta ---
  line('final-lap-count', 'ULTIMA VOLTA, CARALHO! E AGORA!', 'ULTIMA VOLTA, CARALHOO—E AGORAA!', C.FINAL_LAP),
  line('last-lap-everything', 'ULTIMA VOLTA! METE TUDO QUE TEM!', 'ULTIMA VOLTA—METE TUDO QUE TEMMM!', C.FINAL_LAP),
  line('final-lap-no-holding', 'ULTIMA VOLTA! SEM FREIO, PORRA!', 'ULTIMA VOLTA—SEM FREIO, PORRAA!', C.FINAL_LAP),

  // --- vitoria ---
  line('burns-across', 'QUEIMA A LINHA DE CHEGADA!', 'QUEIMA A LINHA DE CHEGADAA!', C.VICTORY),
  line('takes-the-crown', 'LEVA A COROA! QUE CORRIDA!', 'LEVA A COROA—QUE CORRIDAA!', C.VICTORY),
  line('thats-how-you-win', 'GANHOU, PORRA! QUE ARRANCADA!', 'GANHOU, PORRAA—QUE ARRANCADAA!', C.VICTORY),

  // --- segundo ---
  line('second-hell-of-a-ride', 'SEGUNDO LUGAR! AINDA FOI UMA PORRADA DE CORRIDA!', 'SEGUNDO LUGAR—AINDA FOI UMA PORRADA DE CORRIDAA!', C.SECOND),
  line('second-so-close', 'SEGUNDO! QUASE, MANO!', 'SEGUNDO—QUASE, MANOOO!', C.SECOND),

  // --- ultimo ---
  line('last-place-next-time', 'ULTIMO, MANO... FOI NO SUFOCO.', 'ULTIMO, MANO—FOI NO SUFOCOO.', C.LAST),
  line('dead-last', 'ULTIMO LUGAR! ESSA PISTA FOI BRUTA!', 'ULTIMO LUGAR—ESSA PISTA FOI BRUTAA!', C.LAST),
];
