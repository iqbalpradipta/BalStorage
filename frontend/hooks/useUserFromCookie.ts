"use client";

import { useState, useEffect } from "react";
import { authService } from "@/services/auth";

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
}

export function useUserFromCookie() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(authService.getUser());
  }, []);

  return { user };
}
