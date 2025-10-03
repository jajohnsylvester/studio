
"use client";

import { useState, useEffect, useCallback } from 'react';

const PASSWORD_KEY = 'masterPassword';

type DialogOptions = {
    title: string;
    description: string;
    onSuccess: () => void;
    onCancel?: () => void;
};

export function useMasterPassword() {
  const [storedPassword, setStoredPassword] = useState<string | null>(null);
  const [isPasswordSet, setIsPasswordSet] = useState(false);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogOptions, setDialogOptions] = useState<DialogOptions>({
      title: '',
      description: '',
      onSuccess: () => {},
  });

  useEffect(() => {
    try {
        const item = window.localStorage.getItem(PASSWORD_KEY);
        if (item) {
            setStoredPassword(item);
            setIsPasswordSet(true);
        }
    } catch (error) {
        console.error("Could not access localStorage", error);
    }
  }, []);

  const setPassword = useCallback((password: string) => {
    try {
        window.localStorage.setItem(PASSWORD_KEY, password);
        setStoredPassword(password);
        setIsPasswordSet(true);
    } catch (error) {
        console.error("Could not access localStorage", error);
    }
  }, []);

  const verifyPassword = useCallback((password: string) => {
    return password === storedPassword;
  }, [storedPassword]);

  const showPasswordDialog = useCallback((options: DialogOptions) => {
      setDialogOptions(options);
      setIsDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setIsDialogOpen(false);
    if (dialogOptions.onCancel) {
        dialogOptions.onCancel();
    }
  }, [dialogOptions]);

  const passwordDialogProps = {
    isOpen: isDialogOpen,
    onClose: handleCloseDialog,
    title: dialogOptions.title,
    description: dialogOptions.description,
    isPasswordSet,
    verifyPassword,
    setPassword,
    onSuccess: dialogOptions.onSuccess,
  };

  return {
    isPasswordSet,
    setPassword,
    verifyPassword,
    showPasswordDialog,
    passwordDialogProps,
  };
}
