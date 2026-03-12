import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import {
    Card,
} from "@/components/ui/card"

import { FieldSeparator } from "@/components/ui/field"

interface EstimateProjectDetailsProps{
    serviceName: string;
    onBack: () => void;
}

export function EstimateProjectDetails({serviceName, onBack}: EstimateProjectDetailsProps) {
    
  return (
        <div className="sm:max-w-2xl sm:max-h-2xl">
            <DialogHeader>
                <DialogTitle className="text-2xl font-extrabold">Review & Estimate Project</DialogTitle>
                <DialogDescription>
                Please review all details before submitting.
                </DialogDescription>
            </DialogHeader>
               
            
            <FieldSeparator className="mt-4 mb-2"/>
            
            <div className="-mx-4 no-scrollbar max-h-[70vh] overflow-y-auto px-4 py-4">
                
              <Card className="rounded-lg">
                <div className=" divide-y">
                    {/* Service Summary */}
                    <div className="p-6 -mt-4">
                    <h3 className="font-semibold text-gray-900 mb-4">Service Details</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                        <p className="text-gray-600">Service</p>
                        <p className="font-medium">{serviceName}</p>
                        </div>
                        
                    </div>
                    </div>

                    {/* Project Details */}
                    <div className="p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Project Information</h3>
                    <div className="space-y-3 text-sm">
                        <div>
                        <p className="text-gray-600">Project Name</p>
                        <p className="font-medium"></p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                        
                        <div>
                            <p className="text-gray-600">Material</p>
                            <p className="font-medium"></p>
                        </div>
                        </div>
                    
                        <div>
                        <p className="text-gray-600">Description</p>
                        <p className="font-medium"></p>
                        </div>
                    
                    </div>
                    </div>

                    {/* Files */}
                    <div className="p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Uploaded Files</h3>
                    <div className="flex items-center bg-gray-50 p-3 rounded">
                        
                        <div>
                        <p className="font-medium text-sm">miming-model.stl</p>
                        <p className="text-xs text-gray-500">2.3 MB</p>
                        </div>
                    </div>
                    </div>

                    {/* Pricing */}
                    <div className="p-6 bg-gray-50">
                    <h3 className="font-semibold text-gray-900 mb-4">Pricing Estimate</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                        <span className="text-gray-600">Base Price</span>
                        <span className="font-medium">P 0.00</span>
                        </div>
                        <div className="flex justify-between">
                        <span className="text-gray-600">Duration</span>
                        <span className="font-medium">0 mins</span>
                        </div>
                    
                        <div className="flex justify-between pt-2 border-t border-gray-300">
                        <span className="font-semibold">Estimated Total</span>
                        <span className="font-semibold text-lg text-chart-6">P 0.00</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Final price may vary based on actual production time and materials used.</p>
                    </div>
                    </div>
                </div>

                    {/* Terms */}
                    <div className="flex items-start p-6">
                        <input
                        type="checkbox"
                        id="terms"
                        className="mt-1 h-4 w-4 text-chart-6 rounded"
                        
                        />
                        <label htmlFor="terms" className="ml-3 text-sm text-gray-600">
                        I understand that this is a booking request and requires admin approval. 
                        I agree to the <a href="#" className="text-chart-6 hover:underline">terms and conditions</a> and 
                        the <a href="#" className="text-chart-6 hover:underline">cancellation policy</a>.
                        </label>
                </div>

              </Card>

            </div>

            <FieldSeparator className="mb-4"/>
            <DialogFooter>
                
                <Button variant="outline" className="rounded-lg" onClick={onBack}>Back</Button>
                
                <Button type="submit" className="rounded-lg">Submit Project Request</Button>
            </DialogFooter>
        </div>
  )
}
