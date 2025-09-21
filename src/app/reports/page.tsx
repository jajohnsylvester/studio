
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight font-headline">Reports</h1>
      <Card>
        <CardHeader>
          <CardTitle>Reports Unavailable</CardTitle>
          <CardDescription>
            The reports page is temporarily unavailable. We are working to restore it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Please check back later.</p>
        </CardContent>
      </Card>
    </div>
  );
}
