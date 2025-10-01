
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ReportsPage() {

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Reports</h1>
      </div>
      
      <Card className="h-[80vh]">
        <CardHeader>
            <CardTitle>Personal Stream</CardTitle>
            <CardDescription>
                Your personal analytics dashboard.
            </CardDescription>
        </CardHeader>
        <CardContent className="h-full pb-6">
            <iframe 
                src="https://mypersonalstream.streamlit.app/?embed=true"
                className="w-full h-full border-0 rounded-lg"
                title="Personal Stream"
            ></iframe>
        </CardContent>
      </Card>
    </div>
  );
}
