import type { Law } from '@shared/laws';

export type Chapter = {
  law: Law;
  numeral: string;
  name: string;
  theme: string;
  statement: string;
  keyLine: string;
  paragraphs: [string, string, string];
  footnote: string;
  toolName: string;
};

export const CHAPTERS: Chapter[] = [
  {
    law: 'murphy',
    numeral: 'I',
    name: "Murphy's Law",
    theme: 'On fear',
    statement: 'The thing you fear most will happen has the highest chance of happening.',
    keyLine: 'A fear is a forecast with no plan attached.',
    paragraphs: [
      "Fearing something doesn't make it happen. But a fear you keep circling pulls your attention toward the problem and away from the plan. You freeze, you avoid, and the thing you dreaded gets more room to grow.",
      "Treat the fear as information: your mind is predicting a specific event. A fear is a forecast with no plan attached. Give it a date, an early warning sign and an 'if this, then that', and it becomes something you can work with.",
      'Then check back. Most people never find out how often their fears come true. Logging the outcome shows you which worries deserve a plan and which ones were only noise.',
    ],
    footnote:
      'The original Murphy\'s Law is "anything that can go wrong will go wrong", usually traced to engineer Edward Murphy and US Air Force rocket-sled tests in 1949. Engineers used it as a reason to plan for failure.',
    toolName: 'Fear forecast',
  },
  {
    law: 'kidlin',
    numeral: 'II',
    name: "Kidlin's Law",
    theme: 'On problems',
    statement: 'If you write your problem down, half of it gets solved right there.',
    keyLine: "Most of a problem's weight is fog.",
    paragraphs: [
      'A problem that lives only in your head feels bigger than it is. It loops, mixes with other worries and never quite takes a shape you can act on.',
      "Most of a problem's weight is fog. Writing it down forces you to name what is actually happening, what solved would look like, and which part is yours to control. Half the work is in that naming.",
      'Start messy. Rant first, then answer a few plain questions. The goal is not a perfect description. It is one next step small enough to do in the next twenty minutes.',
    ],
    footnote:
      'Nobody knows who Kidlin was. "A problem well stated is a problem half solved" is usually credited to inventor Charles Kettering.',
    toolName: 'Problem page',
  },
  {
    law: 'wilson',
    numeral: 'III',
    name: "Wilson's Law",
    theme: 'On learning',
    statement: "When you're learning something new, you have to set your ego and beliefs aside.",
    keyLine: 'Put your beliefs on the shelf for the length of the lesson.',
    paragraphs: [
      "The hardest part of learning is not the new material. It is what you already think you know. Old assumptions quietly filter out anything that doesn't fit, and pride stops you asking the basic question.",
      'Put your beliefs on the shelf for the length of the lesson. You are not throwing them away. You can pick them up again afterwards and check whether they still fit.',
      'Ask the question a complete beginner would ask, even if it feels obvious. Then try explaining the topic in plain words. Wherever your explanation turns vague is exactly where your understanding stops.',
    ],
    footnote:
      'Most lists word Wilson\'s Law as "put knowledge first and money will follow". This version is closer to the Zen idea of shoshin, beginner\'s mind.',
    toolName: 'The shelf',
  },
  {
    law: 'falkland',
    numeral: 'IV',
    name: "Falkland's Law",
    theme: 'On decisions',
    statement: "When you don't need to make a decision, don't rush into one.",
    keyLine: 'If nothing breaks while the question stays open, every extra day brings you more facts for free.',
    paragraphs: [
      'Pressure to decide often comes from discomfort, not from a deadline. An open question feels heavy, so we close it early just to stop thinking about it.',
      'If nothing breaks while the question stays open, every extra day brings you more facts for free. Waiting is a choice too, and sometimes it is the smartest one on the table.',
      'But parking a decision is not the same as avoiding it. Name what you need to find out, set a date to come back, and decide then. If waiting buys you nothing, just pick one and move on.',
    ],
    footnote:
      'Lucius Cary, 2nd Viscount Falkland, said in the English Parliament in the early 1640s: "where it is not necessary to change, it is necessary not to change." The decision version is a later adaptation.',
    toolName: 'Decision parking',
  },
  {
    law: 'gilbert',
    numeral: 'V',
    name: "Gilbert's Law",
    theme: 'On work',
    statement:
      'The biggest problem at work is that nobody tells you what you actually need to do. Nobody gives you clear directions.',
    keyLine: 'Ask the questions that turn their picture into words, before you start.',
    paragraphs: [
      'Whoever gives you a task has a picture in their head of what finished looks like. They rarely say it out loud, and you rarely ask. So you guess, and find out at the end.',
      'Ask the questions that turn their picture into words, before you start. What does done look like? When is it due? Who signs it off? A two-minute message can save two days of rework.',
      "Nobody hands you clear directions, so getting them is part of the job. Asking is not a sign you can't do the work. It is how good work starts.",
    ],
    footnote:
      'The common version says finding the best way to the result is your responsibility. Together: nobody hands you clear directions, so getting them is part of the job.',
    toolName: 'Brief builder',
  },
];

export const chapterFor = (law: string) => CHAPTERS.find((c) => c.law === law);
