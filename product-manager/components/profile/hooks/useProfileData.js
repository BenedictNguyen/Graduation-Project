import { useState } from 'react';

export const useProfileData = () => {
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [avatarSelectorVisible, setAvatarSelectorVisible] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [savingName, setSavingName] = useState(false);

  return {
    showAboutModal,
    setShowAboutModal,
    avatarSelectorVisible,
    setAvatarSelectorVisible,
    showEditNameModal,
    setShowEditNameModal,
    displayName,
    setDisplayName,
    savingName,
    setSavingName,
  };
};

