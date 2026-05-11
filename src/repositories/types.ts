import { picksRepository } from './picks';
import { presenceRepository } from './presence';
import { missedRepository } from './missed';
import { announcementsRepository } from './announcements';
import { usersRepository } from './users';
import { bandsRepository } from './bands';

export type IPicksRepository = typeof picksRepository;
export type IPresenceRepository = typeof presenceRepository;
export type IMissedRepository = typeof missedRepository;
export type IAnnouncementsRepository = typeof announcementsRepository;
export type IUsersRepository = typeof usersRepository;
export type IBandsRepository = typeof bandsRepository;
