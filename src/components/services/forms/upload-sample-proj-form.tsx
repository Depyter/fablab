"use client";

import * as React from "react";
import { UploadCloudIcon, XIcon, ImagePlusIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileUpload } from "@/components/file-upload";

interface SampleProjectsFormProps {
  form: any;
}

export function SampleProjectsForm({ form }: SampleProjectsFormProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    field: any
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} is too large. Max size is 5MB.`);
        return;
      }
      const imageUrl = URL.createObjectURL(file);
      field.pushValue(imageUrl);
    });

    event.target.value = "";
  };

  return (

    <FileUpload
      accept="image/png, image/jpeg, image/jpg"
    />
    
    // <Card className="w-full sm:max-w-md border-none shadow-none p-8">
    //   <CardHeader className="px-0">
    //     <CardTitle className="font-bold text-lg">Sample Projects</CardTitle>
    //   </CardHeader>
    //   <CardContent className="px-0">
        
        
    //     <form.Field
    //       name="projects"
    //       mode="array"
    //       children={(field: any) => {
    //         const hasImages = field.state.value.length > 0;

    //         return (
    //           <div
    //             className={cn(
    //               "relative border-2 border-dashed rounded-2xl p-8 transition-all",
    //               "border-gray-200 bg-white",
    //               !hasImages && "flex flex-col items-center justify-center min-h-60"
    //             )}
    //           >
    //             <input
    //               type="file"
    //               multiple
    //               accept="image/png, image/jpeg, image/jpg"
    //               ref={fileInputRef}
    //               className="hidden"
    //               onChange={(e) => handleFileChange(e, field)}
    //             />

    //             {/* --- EMPTY (Matches image_42aeab.png) --- */}
    //             {!hasImages && (
    //               <>
    //                 <ImagePlusIcon className="h-10 w-10 text-[#9D174D] mb-4 stroke-[1.5]" />
    //                 <div className="text-center mb-5">
    //                   <p className="text-sm font-semibold text-[#9D174D]">
    //                     Drop your images here
    //                   </p>
    //                   <p className="text-xs text-gray-500">PNG or JPG (max. 5MB)</p>
    //                 </div>
    //                 <Button
    //                   type="button"
    //                   className="bg-[#9D174D] hover:bg-[#83103F] rounded-xl px-8 flex gap-2 font-medium"
    //                   onClick={() => fileInputRef.current?.click()}
    //                 >
    //                   <UploadCloudIcon className="h-4 w-4" />
    //                   Select images
    //                 </Button>
    //               </>
    //             )}

    //             {/* WITH IMAGES (Matches image_429f88.png) --- */}
    //             {hasImages && (
    //               <div className="space-y-4">
    //                 <div className="flex items-center justify-between">
    //                   <p className="text-primary font-medium text-xs">
    //                     Uploaded Files ({field.state.value.length})
    //                   </p>
    //                   <Button
    //                     type="button"
    //                     size="sm"
    //                     className="bg-primary hover:bg-[#83103F] rounded-lg px-4 flex justify-between h-8"
    //                     onClick={() => fileInputRef.current?.click()}
    //                   >
    //                     <UploadCloudIcon className="h-4 w-4" />
    //                     Select images
    //                   </Button>
    //                 </div>

    //                 <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
    //                   {field.state.value.map((imageUrl: string, index: number) => (
    //                     <div key={index} className="relative">
    //                       <div className="overflow-hidden rounded-xl bg-gray-100 aspect-square">
    //                         <img
    //                           src={imageUrl}
    //                           alt="Project preview"
    //                           className="object-cover w-full h-full"
    //                         />
    //                       </div>
    //                       <button
    //                         type="button"
    //                         onClick={() => {
    //                           field.removeValue(index);
    //                           URL.revokeObjectURL(imageUrl);
    //                         }}
    //                         className="absolute -top-2 -right-2 p-1 bg-[#2D3142] text-white rounded-full border-2 border-white hover:bg-black transition-colors"
    //                       >
    //                         <XIcon className="h-3 w-3" />
    //                       </button>
    //                     </div>
    //                   ))}
    //                 </div>
    //               </div>
    //             )}
    //           </div>
    //         );
    //       }}
    //     />
    //   </CardContent>
    // </Card>
  );
}