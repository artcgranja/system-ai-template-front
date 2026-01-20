'use client';

import { Building2, Mail, Shield, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { UserProfileInfo } from '@/types/analytics';

interface UserProfileCardProps {
  userProfile: UserProfileInfo;
}

/**
 * Card component displaying user profile information
 * Shows name, email, department, and role
 */
export function UserProfileCard({ userProfile }: UserProfileCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <User className="h-5 w-5" />
          Perfil do Usuario
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-lg font-semibold text-primary">
              {userProfile.fullName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-medium text-lg">{userProfile.fullName}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {userProfile.email}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Departamento</p>
              <p className="text-sm font-medium">{userProfile.departmentName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Cargo</p>
              <p className="text-sm font-medium">{userProfile.roleName}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

