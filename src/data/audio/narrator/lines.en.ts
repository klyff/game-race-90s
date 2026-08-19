import { NARRATOR_CATEGORY, line, type NarratorLine } from './shared.ts';

const C = NARRATOR_CATEGORY;

/** English arcade bank. Catchphrases use Bruno / Thanner. */
export const EN_NARRATOR_LINES: readonly NarratorLine[] = [
  // --- race-start ---
  line('engines-hot', "ENGINES HOT... LET'S ROCK!", "ENGINES HOT—LET'S ROCKKK!", C.RACE_START),
  line('crank-it-up-live', 'CRANK IT UP!!!!  RACE IS LIVE!!!!', "CRANK'T UP—RACE IS LIIIVE!!!", C.RACE_START),
  line('burn-rubber', 'BURN RUBBER, …BURN RUBBER….  BRING THE NOISE!', 'BURN RUBBERR—BURN RUBBERR—BRING THE NOIISE!', C.RACE_START),
  line('no-brakes', 'NO BRAKES! NO MERCY! GO GO GO!', 'NO BRAKES—NO MERCY—GO GO GOOO!', C.RACE_START),
  line('turn-it-up', 'TURN IT UP... AND TEAR IT UP!', 'TURN IT UP—AND TEAR IT UPPP!', C.RACE_START),
  line('get-on-fire', 'GET ON FIREEEEEEE!', 'GET ON FIREEEEEE!', C.RACE_START),

  // --- damage ---
  line('ready-to-explode', "THAT RIDE'S READY TO EXPLODE!", "THAT RIDE'S READY TO EXPLOOODE!", C.DAMAGE),
  line('one-more-hit', "ONE MORE HIT... AND IT'S TOAST!", "ONE MORE HIT—AND IT'S TOAAAST!", C.DAMAGE),
  line('owww-hurt', "OWWW! THAT'S GONNA HURT!", "OWWW—THAT'S GONNA HURRRT!", C.DAMAGE),
  line('ouch-oh-man', 'OUCH!…. OH MAAAN!', 'OUCH—OH MAAAAN!', C.DAMAGE),
  line('cu-travou', 'WHOA, THAT ONE LOCKED ME UP!', 'WHOA—THAT ONE LOCKED ME UPPP!', C.DAMAGE, 3),

  // --- boost ---
  line('boost-engaged', 'BOOST ENGAGED... HANG ON!', 'BOOST ENGAGED—HANG ONNN!', C.BOOST),
  line('turbo-lit', "TURBO'S LIT! HERE WE GO!", "TURBO'S LITT—HERE WE GOOO!", C.BOOST),
  line('juiced-up', 'JUICED UP AND READY!', 'JUICED UP AND READYYY!', C.BOOST),
  line('powers-up', "POWER'S UP! LET'S MOVE!", "POWER'S UP—LET'S MOVE!", C.BOOST),

  // --- banter ---
  line('lok-thant-enzo', 'LOK Thant BRUNO!', 'LOK THANT BRUUNNO!', C.BANTER, 3),
  line('holy-chimbeler', 'HOLY THANNER!!!', 'HOLY THANNNERRR!!!', C.BANTER, 3),
  line('chimbeeler', 'THANNEERRR!!!', 'THANNEERRR!!!', C.BANTER, 3),
  line('porra-bruno-pronto', 'DAMN BRUNO, YOU BETTER BE READY!', 'DAMN BRUNO—YOU BETTER BE READYYY!', C.BANTER, 3),
  line('thanner-roadmap', 'THANNER, ROADMAP! ROADMAP!', 'THANNER—ROADMAAAP! ROADMAAAP!', C.BANTER, 3),
  line('caraio-thanner-vasco', 'DAMN THANNER, WORSE THAN LAST PLACE OUT THERE!', 'DAMN THANNER—WORSE THAN LAST PLACE OUT THERRE!', C.BANTER, 3),
  line('oxente-doido', "WHOA, WHAT'S THIS CRAZY GUY WANT?!", "WHOA—WHAT'S THIS CRAZY GUY WANTT?!", C.BANTER, 3),
  line('puta-merda-passou', 'HOLY CRAP, HE BLEW RIGHT PAST!', 'HOLY CRAP—HE BLEW RIGHT PASTT!', C.BANTER, 3),
  line('what-just-happened', 'WHAT JUST HAPPENED?!', 'WHAT JUST HAPPENNND?!', C.BANTER),
  line('that-was-insane', 'THAT WAS INSANE!', 'THAT WAS INSAAANE!', C.BANTER),
  line('call-a-mechanic', 'SOMEBODY CALL A MECHANIC!', 'SOMEBODY CALL A MECHANIC!', C.BANTER),
  line('leave-a-mark', "THAT'S GONNA LEAVE A MARK!", "THAT'S GONNA LEAVE A MARRK!", C.BANTER),
  line('ouchhhh', 'Ouuchhhh?', 'OUUUCHHHH?', C.BANTER),
  line('wrong-way', 'WROOONG WAY!', "WROOONG WAY—TURN'ROUND!!!", C.BANTER),
  line('boooom', 'BOOOOOM!', 'BOOOOOOM!', C.BANTER),
  line('boom-new-leader', 'BOOM! NEW LEADER!', 'BOOM—NEW LEADERRR!', C.BANTER),
  line('this-guy-crazy', 'THIS GUY ARE CRADY, Dude!', "THIS GUY'S CRAZY, DUDE!", C.BANTER),
  line('gone-way-out', 'GONE! WAY OUT FRONT!', 'GONE—WAY OUT FRONTT!', C.BANTER),

  // --- behind ---
  line('lost-the-map', 'SOMEBODY LOST THE RACE MAP!', 'SOMEBODY LOST THE RACE MAPP!', C.BEHIND),
  line('hello-up-here', 'HELLOOO? THE RACE IS UP HERE!', 'HELLOOO—THE RACE IS UP HEEERE!', C.BEHIND),

  // --- weapons ---
  line('boom-direct-hit', 'BOOOOM! DIRECT HIT!', 'BOOOM—DIRECT HITTT!!!', C.WEAPONS),
  line('nailed-it', 'NAILED IT! THAT ONE HURT!', 'NAILED ITT—THAT ONE HURRRT!', C.WEAPONS),
  line('here-comes-heat', 'HERE COMES THE HEAT!', 'HERE COMES THE HEAATT!', C.WEAPONS),
  line('brings-the-fire', 'BRINGS THE FIIIRE!', 'BRINGS THE FIIIIRE!', C.WEAPONS),
  line('total-wipeout', 'TOTAL WIPEOUT!', 'TOTAL WIPEOUUT!', C.WEAPONS),
  line('eita-porrada', 'THAT WAS A HELL OF A HIT!', 'THAT WAS A HELL OF A HITTT!', C.WEAPONS, 3),

  // --- final-lap ---
  line('final-lap-count', 'FIIINAL LAP! MAKE IT COUNT!', 'FIIINAL LAP—MAKE IT COUNTTT!', C.FINAL_LAP),
  line('last-lap-everything', "LAST LAP! EVERYTHING YOU'VE GOT!", "LAST LAP—EVERYTHING YOU'VE GOTTT!", C.FINAL_LAP),
  line('final-lap-no-holding', 'FINAL LAP! NO HOLDING BACK!', 'FINAL LAP—NO HOLDING BACKKK!', C.FINAL_LAP),

  // --- victory ---
  line('burns-across', 'BURNS ACROSS THE LINE!', 'BURNS ACROSS THE LINNNE!', C.VICTORY),
  line('takes-the-crown', 'TAKES THE CROWN! WHAT A RUN!', 'TAKES THE CROWN—WHAT A RUNNN!', C.VICTORY),
  line('thats-how-you-win', "THAT'S HOW YOU WIN A RACE!", "THAT'S HOW YOU WIN A RACEEE!", C.VICTORY),

  // --- second ---
  line('second-hell-of-a-ride', 'SECOND PLACE! STILL A HELL OF A RIDE!', 'SECOND PLACE—STILL A HELL OF A RIDEE!', C.SECOND),
  line('second-so-close', 'SECOND! SO CLOSE TO GLORY!', 'SECOND—SO CLOSE TO GLORYYY!', C.SECOND),

  // --- last ---
  line('last-place-next-time', 'LAST PLACE... BETTER TURN IT UP NEXT TIME!', 'LAST PLACE—BETTER TURN IT UP NEXT TIIIME!', C.LAST),
  line('dead-last', 'DEAD LAST! THAT ROAD WAS BRUTAL!', 'DEAD LAST—THAT ROAD WAS BRUTALLL!', C.LAST),
];
