import { randomBytes } from 'node:crypto';
import { testData } from '../config/test-data';

export interface User {
  name: string;
  email: string;
  password: string;
  title: 'Mr' | 'Mrs';
  birthDay: string;
  birthMonth: string;
  birthYear: string;
  firstName: string;
  lastName: string;
  company: string;
  address1: string;
  address2: string;
  country: string;
  state: string;
  city: string;
  zipcode: string;
  mobileNumber: string;
}

/**
 * Builds user data that is unique across parallel workers and repeated runs:
 * timestamp + worker index + random suffix. Nothing is created on the site here.
 */
export function buildUser(workerIndex: number): User {
  const profile = testData.user;
  const suffix = randomBytes(4).toString('hex');
  const id = `${Date.now()}_w${workerIndex}_${suffix}`;

  return {
    name: `${profile.namePrefix} ${suffix}`,
    email: `${profile.emailPrefix}_${id}@${profile.emailDomain}`.toLowerCase(),
    password: `Pw-${randomBytes(9).toString('base64url')}`,
    title: profile.title,
    birthDay: profile.birthDate.day,
    birthMonth: profile.birthDate.month,
    birthYear: profile.birthDate.year,
    firstName: profile.firstName,
    lastName: profile.lastName,
    company: profile.company,
    address1: profile.address1,
    address2: profile.address2,
    country: profile.country,
    state: profile.state,
    city: profile.city,
    zipcode: profile.zipcode,
    mobileNumber: profile.mobileNumber,
  };
}
