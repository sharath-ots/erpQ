'use client';

import { sendPasswordResetEmail } from 'firebase/auth';
import { firebaseAuth } from 'services/firebase/firebase';
import ForgotPasswordForm from 'components/sections/authentications/common/ForgotPasswordForm';

const page = () => {
  const handleSendResetLink = async ({ email }) => {
    return await sendPasswordResetEmail(firebaseAuth, email).catch((error) => {
      throw new Error(error.message);
    });
  };

  return <ForgotPasswordForm handleSendResetLink={handleSendResetLink} />;
};

export default page;
