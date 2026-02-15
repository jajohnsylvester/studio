
'use client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function NotesPage() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
          <CardDescription>This feature is not yet implemented.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Building a custom rich-text editor for Google Docs is a complex feature. As a next step, a plain-text editor can be implemented.</p>
        </CardContent>
      </Card>
    </div>
  );
}
