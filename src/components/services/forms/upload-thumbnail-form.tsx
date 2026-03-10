"use client";

import * as React from "react";
import {
  XIcon,
  ImagePlusIcon,
  CirclePlus,
  UploadCloudIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";

interface ThumbnailFormProps {
  form: any;
}

export function ThumbnailForm({ form }: ThumbnailFormProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: any,
  ) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        field.pushValue(URL.createObjectURL(file));
      });
    }
  };

  return (
    <Card className="w-full sm:max-w-md border-none shadow-none p-5">
      <CardHeader className="px-0">
        <CardTitle className="font-bold text-lg">Thumbnail</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <form.Field
          name="images"
          mode="array"
          children={(field: any) => {
            const hasImages = field.state.value.length > 0;
            const mainImage = field.state.value[0];
            const extraImages = field.state.value.slice(1);

            return (
              <div className="flex flex-col gap-4">
                <input
                  type="file"
                  multiple
                  accept="image/png, image/jpeg, image/jpg"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={(e) => handleFileChange(e, field)}
                />

                {!hasImages ? (
                  /* --- EMPTY --- */
                  <div className="w-full aspect-video p-5 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-[#9D174D] hover:bg-[#9D174D]/5 transition-all">
                    <ImagePlusIcon className="h-10 w-10 text-[#9D174D] mb-2" />
                    <p className="text-sm font-semibold text-[#9D174D]">
                      Drop your images here
                    </p>
                    <p className="text-xs text-gray-400">
                      PNG or JPG. max(5MB)
                    </p>
                    <Button
                      type="button"
                      className="bg-[#9D174D] hover:bg-[#83103F] rounded-xl px-8 flex gap-2 font-medium cursor-pointer mt-3"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <UploadCloudIcon className="h-4 w-4" />
                      Select images
                    </Button>
                  </div>
                ) : (
                  /* --- HAS IMAGES --- */
                  <div className="flex flex-col gap-4">
                    {/* Large Main Image */}
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                      <Image
                        src={mainImage}
                        alt="Main"
                        className="object-cover w-full h-full"
                        width={640}
                        height={360}
                      />
                      <button
                        type="button"
                        onClick={() => field.removeValue(0)}
                        className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Grid for remaining images + Plus Button */}
                    <div className="flex flex-wrap gap-4">
                      {extraImages.map((imgUrl: string, index: number) => (
                        <div
                          key={index + 1}
                          className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200 bg-gray-50"
                        >
                          <Image
                            src={imgUrl}
                            alt={`Thumb ${index + 1}`}
                            width={96}
                            height={96}
                            className="object-cover w-full h-full"
                          />
                          <button
                            type="button"
                            onClick={() => field.removeValue(index + 1)}
                            className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full hover:bg-black"
                          >
                            <XIcon className="h-3 w-3" />
                          </button>
                        </div>
                      ))}

                      <div
                        className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-[#9D174D] hover:bg-[#9D174D]/5 transition-all"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <CirclePlus className="h-8 w-8 text-gray-400" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          }}
        />
      </CardContent>
    </Card>
  );
}
