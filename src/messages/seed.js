import { people } from '../data/people';

export const maya = { id: 'maya', name: 'Maya Chen', avatar: 'M', bio: 'Hosts quiet rooms for curious people.', interests: ['Books', 'Art', 'Coffee'], preference: 'Friendship', prompt: 'What are you making time for lately?' };
export const demoDirectory = [...people, maya];

export const seedCommunities = [
  { id: 'intersect', name: 'Intersect', icon: 'I', official: true, description: 'The official home of Intersect. Say hello, share what you are curious about.', channels: [{ id: 'welcome', name: 'welcome', topic: 'Start here and say hello.' }, { id: 'general', name: 'general', topic: 'Talk about anything curious.' }, { id: 'films', name: 'films', topic: 'Recommendations, rewatches, and scene debates.' }] },
  { id: 'slow-makers', name: 'Slow Makers', icon: 'S', official: true, description: 'Share works in progress and give thoughtful feedback.', channels: [{ id: 'lounge', name: 'lounge', topic: 'Share works in progress.' }, { id: 'feedback', name: 'feedback', topic: 'Thoughtful feedback only.' }] },
  { id: 'night-owls', name: 'Night Owls', icon: 'N', official: true, description: 'For people who do their best thinking after midnight.', channels: [{ id: 'after-dark', name: 'after-dark', topic: 'Late-night thoughts, playlists, insomnia.' }] },
];

const ago = (mins) => new Date(Date.now() - mins * 60000).toISOString();
const m = (scope, senderId, body, mins, extra = {}) => ({ id: `seed-${scope}-${mins}`, scope, senderId, body, createdAt: ago(mins), reactions: {}, ...extra });

export const seedMessages = () => ({
  'ch:welcome': [m('ch:welcome', 'maya', 'Welcome to Intersect. Tell us one thing you are curious about today.', 190), m('ch:welcome', 'maya', 'No pressure to be clever. Small and specific is great.', 188), m('ch:welcome', 'jordan', 'Currently curious about why every great film has a great last shot.', 120, { reactions: { '🔥': ['alex'], '👀': ['maya', 'sam'] } })],
  'ch:general': [m('ch:general', 'alex', 'What is everyone making time for lately?', 95), m('ch:general', 'sam', 'Trail runs before work. Surprisingly social, actually.', 80), m('ch:general', 'sam', 'Also trying to finish one (1) album per week.', 79), m('ch:general', 'alex', 'That is a good rule. Taking notes on it.', 70, { replyTo: 'seed-ch:general-79' })],
  'ch:films': [m('ch:films', 'jordan', 'The Film Club is sharing comfort-movie recommendations in here.', 1500)],
  'ch:lounge': [m('ch:lounge', 'maya', 'A quiet place to share what you are working on.', 400)],
  'ch:feedback': [], 'ch:after-dark': [],
  'dm:alex': [m('dm:alex', 'alex', 'That prompt was a good one. What are you reading lately?', 12)],
});
