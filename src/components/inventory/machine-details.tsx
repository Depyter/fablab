"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUpload } from "@/components/file-upload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "radix-ui";
import { ActionDialog } from "@/components/action-dialog";

export function MachineDetails() {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Mock Saving Machine...");
    // Simulate network request
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // In a real app, you'd likely close the dialog here
  };

  return (
    <div className="flex flex-col h-full max-h-[80vh] bg-background">
      <header className="sticky top-0 bg-white z-50 p-4 border-b">
        <h2 className="text-2xl font-bold text-gray-900">Edit Machine</h2>
      </header>
      
      <form id="edit-machine-form" onSubmit={handleSubmit} className="flex-grow no-scrollbar overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-4">
            <FieldSet>
              <Card>
                <CardHeader>
                  <CardTitle className="font-bold text-lg">
                      General Information
                  </CardTitle>
                  <CardDescription>Provide details about your service.</CardDescription>
                </CardHeader>

                <CardContent>
                    <FieldGroup className="mt-4 space-y-4">
                    <Field>
                      <FieldLabel htmlFor="machine-name">Machine Name</FieldLabel>
                      <Input id="machine-name" placeholder="e.g. Prusa MK4" required />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="machine-description">Description</FieldLabel>
                      <Textarea 
                        id="machine-description" 
                        placeholder="Describe the machine..."
                        className="resize-height w-full"
                        rows={4}
                        required
                      />
                    </Field>
                  </FieldGroup>
                </CardContent>
              </Card>
              
            </FieldSet>
          </div>

          <div>
            <FileUpload
              title="Thumbnail"
              accept="image/png, image/jpeg, image/jpg"
              onFilesChange={() => {}}
            />
          </div>

          <div className="space-y-4">
            <FieldSet>
              <Card>
                <CardHeader>
                  <CardTitle className="font-bold text-lg">
                      Details
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <FieldGroup className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel htmlFor="machine-type">Type</FieldLabel>
                      <Select defaultValue="3D Printer">
                        <SelectTrigger id="machine-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="3D Printer">3D Printer</SelectItem>
                            <SelectItem value="CNC Mill">CNC Mill</SelectItem>
                            <SelectItem value="Laser Cutter">Laser Cutter</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="machine-status">Status</FieldLabel>
                      <Select defaultValue="Available">
                        <SelectTrigger id="machine-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="Available">Available</SelectItem>
                            <SelectItem value="Unavailable">Unavailable</SelectItem>
                            <SelectItem value="Under Maintenance">Under Maintenance</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                  </FieldGroup>
                </CardContent>
              </Card>
              
             
            </FieldSet>
          </div>
        </div>
      </form>
      <footer className="sticky bottom-0 bg-white z-10 p-4 border-t">
        <div className="flex justify-end gap-3">
          <ActionDialog
            onConfirm={() => {}}
            title="Cancel Machine Edit?"
            description="Are you sure you want to cancel editting this machine?"
            baseActionText="Cancel"
            confirmButtonText="Cancel Edit"
      
          />
          <Button
            type="submit"
            form="add-machine-form" // Associate with the form
            className="bg-[#1A8A7E] hover:bg-[#156E65] px-10 font-medium rounded-lg"
          >
            Update
          </Button>
        </div>
      </footer>
    </div>
  );
}
