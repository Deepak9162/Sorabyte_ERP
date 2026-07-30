import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { getTodayDateString } from "../../utils/dateUtils";
import { normalizeImageUrl, resolveStudentPhotoUrl } from "../../utils/imageUtils";
import {
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Save,
  User,
  GraduationCap,
  Users2,
  MapPin,
  UploadCloud,
  FileImage,
  X,
  Sparkles,
  Plus,
  Trash2,
} from "lucide-react";
import api from "../../services/api";
import { useToast } from "../../context/ToastContext";
import Button from "../../components/ui/Button";
import { cn } from "../../utils/cn";

// Form steps definition
const STEPS = [
  { id: "personal", title: "Personal Details", icon: User },
  { id: "academic", title: "Academic Details", icon: GraduationCap },
  { id: "parent", title: "Parent Details", icon: Users2 },
  { id: "address", title: "Address & Photo", icon: MapPin },
];

const AddStudent = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  const { addToast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoError, setPhotoError] = useState("");
  const [photoSource, setPhotoSource] = useState("link");
  const [photoUrlInput, setPhotoUrlInput] = useState("");
  const [photoUrlError, setPhotoUrlError] = useState("");

  const handlePhotoUrlChange = (val) => {
    setPhotoUrlError("");
    setPhotoUrlInput(val);

    if (!val.trim()) {
      setPhotoPreview(null);
      return;
    }

    if (val.length > 500) {
      setPhotoUrlError("URL length cannot exceed 500 characters");
      return;
    }

    const normalized = normalizeImageUrl(val);
    if (normalized) {
      setPhotoPreview(normalized);
    } else {
      setPhotoUrlError("Invalid URL protocol. Please enter a valid HTTPS URL.");
    }
  };

  const [isDragActive, setIsDragActive] = useState(false);
  const [classes, setClasses] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [lastAdmissionNumber, setLastAdmissionNumber] = useState(null);
  
  // Custom dynamic fields state
  const [customFields, setCustomFields] = useState([]);
  const [newFieldKey, setNewFieldKey] = useState("");
  const [isAddingField, setIsAddingField] = useState(false);

  // Initialize React Hook Form
  const {
    register,
    handleSubmit,
    trigger,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      fullName: "",
      gender: "",
      dob: "",
      bloodGroup: "Unknown",
      email: "",
      phone: "",
      cast: "",
      aadhar: "",
      admissionNumber: "",
      rollNumber: "",
      className: "",
      section: "",
      session: "2026-2027",
      status: "Active",
      transportMode: "Private",
      hostelRequired: false,
      fatherName: "",
      motherName: "",
      emergencyContact: "",
      address: "",
      admissionDate: getTodayDateString(),
      discountPercentage: 0,
      previousSchool: "",
    },
    mode: "onTouched",
  });

  const watchClassName = watch("className");
  const watchSection = watch("section");

  // Dynamic API host resolution for static assets (studentPhoto)
  const apiHost = api.defaults.baseURL ? api.defaults.baseURL.replace('/api', '') : "";

  // Fetch classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get("/admin/classes");
        if (res.data.success) {
          setClasses(res.data.data || []);
        }
      } catch (error) {
        console.error("Error fetching classes:", error);
      }
    };
    fetchClasses();
  }, []);

  // Fetch latest admission stats for new student
  useEffect(() => {
    if (isEditMode) return;
    const fetchLatestAdmission = async () => {
      try {
        const res = await api.get("/students/stats/latest-admission");
        if (res.data.success) {
          const { totalStudents, lastAdmissionNumber, nextAdmissionNumber } = res.data.data;
          setTotalStudents(totalStudents);
          setLastAdmissionNumber(lastAdmissionNumber);
          if (nextAdmissionNumber) {
            setValue("admissionNumber", nextAdmissionNumber, { shouldValidate: true, shouldDirty: true });
          }
        }
      } catch (error) {
        console.error("Error fetching latest admission stats:", error);
      }
    };
    fetchLatestAdmission();
  }, [isEditMode, setValue]);

  // Fetch student details for edit mode
  useEffect(() => {
    if (!isEditMode) return;

    const fetchStudent = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/students/${id}`);
        if (res.data.success) {
          const student = res.data.data;
          
          // Populate custom fields from Map/Object
          if (student.customFields) {
            const fieldsArray = Object.entries(student.customFields).map(([key, val]) => ({
              key,
              value: String(val)
            }));
            setCustomFields(fieldsArray);
          } else {
            setCustomFields([]);
          }

          reset({
            fullName: student.fullName || "",
            gender: student.gender || "",
            dob: student.dob ? student.dob.split("T")[0] : "",
            bloodGroup: student.bloodGroup || "Unknown",
            email: student.email || "",
            phone: student.phone || "",
            cast: student.cast || "",
            aadhar: student.aadhar || "",
            admissionNumber: student.admissionNumber || "",
            rollNumber: student.rollNumber || "",
            className: student.className || "",
            section: student.section || "",
            session: student.session || "2026-2027",
            status: student.status || "Active",
            transportMode: student.transportMode || "Private",
            hostelRequired: student.hostelRequired || false,
            fatherName: student.fatherName || "",
            motherName: student.motherName || "",
            emergencyContact: student.emergencyContact || "",
            address: student.address || "",
            admissionDate: student.admissionDate ? student.admissionDate.split("T")[0] : getTodayDateString(),
            discountPercentage: student.discountPercentage || 0,
            previousSchool: student.previousSchool || "",
          });

          if (student.photoSource === 'link' && student.photoUrl) {
            setPhotoSource('link');
            setPhotoUrlInput(student.photoUrl);
            setPhotoPreview(normalizeImageUrl(student.photoUrl));
          } else if (student.studentPhoto) {
            setPhotoSource(student.photoSource || 'upload');
            const photoUrl = student.studentPhoto.startsWith("http") || student.studentPhoto.startsWith("data:")
              ? student.studentPhoto
              : `${apiHost}${student.studentPhoto}`;
            setPhotoPreview(photoUrl);
          }
        }
      } catch (error) {
        console.error("Error fetching student details:", error);
        addToast("Failed to load student details for editing", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, [id, isEditMode, reset, apiHost]);

  const handleNext = async () => {
    let isValid = false;
    if (currentStep === 0) {
      isValid = await trigger(["fullName", "gender", "dob", "email"]);
    } else if (currentStep === 1) {
      isValid = await trigger(["admissionNumber", "rollNumber", "className", "section", "session"]);
    } else if (currentStep === 2) {
      isValid = await trigger(["fatherName", "motherName", "emergencyContact", "address"]);
    }

    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    } else {
      addToast("Please fix validation errors before proceeding", "error");
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Image validation rules
  const validateAndSetImage = (file) => {
    setPhotoError("");
    
    if (!file) return;

    // Validate type (JPEG, PNG, WEBP)
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setPhotoError("Unsupported file type. Please upload a JPEG, PNG, or WEBP image.");
      addToast("Invalid photo type", "error");
      return;
    }

    // Validate size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      setPhotoError("File size exceeds 2MB limit. Please upload a smaller image.");
      addToast("Photo exceeds 2MB limit", "error");
      return;
    }

    // Set preview and file
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Drag and Drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetImage(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetImage(e.target.files[0]);
    }
  };

  const removePhoto = () => {
    setPhotoPreview(null);
    setPhotoFile(null);
    setPhotoUrlInput("");
    setPhotoError("");
    setPhotoUrlError("");
  };

  // Submit handler
  const onSubmit = async (data) => {
    if (photoError || photoUrlError) {
      addToast("Please resolve student photo errors first", "error");
      return;
    }

    setLoading(true);
    try {
      // Convert custom fields array back into an object mapping
      const customFieldsObj = {};
      customFields.forEach(f => {
        if (f.key.trim()) {
          customFieldsObj[f.key.trim()] = f.value;
        }
      });

      const payload = {
        ...data,
        photoSource: 'link',
        photoUrl: photoUrlInput || '',
        studentPhoto: photoUrlInput || photoPreview || "",
        customFields: customFieldsObj,
      };

      let res;
      if (isEditMode) {
        res = await api.put(`/students/${id}`, payload);
      } else {
        res = await api.post("/students/create", payload);
      }
      
      if (res.data.success) {
        addToast(
          isEditMode
            ? "Student profile updated successfully!"
            : "Student enrolled successfully! Credentials created.",
          "success"
        );
        navigate("/students");
      }
    } catch (error) {
      console.error("Save student error:", error);
      const msg = error.response?.data?.message || "Failed to save student. Please verify input fields.";
      addToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* 1. Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/students")}
          className="p-3 text-gray-400 hover:text-gray-900 bg-white border border-gray-100 hover:border-gray-200 rounded-2xl transition-all shadow-sm active:scale-95"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none">
            {isEditMode ? "ERP Student Editor" : "ERP Student Registrations"}
          </span>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight mt-1">
            {isEditMode ? "Edit Student Profile" : "Enroll New Student"}
          </h2>
        </div>
      </div>

      {/* 2. Visual Stepper Tracker */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {STEPS.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-300",
                    index === currentStep
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                      : index < currentStep
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                        : "bg-gray-50 text-gray-400 border border-transparent"
                  )}
                >
                  <step.icon size={18} />
                </div>
                <div className="text-left leading-tight">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider leading-none">
                    Step {index + 1}
                  </p>
                  <h5 className="text-xs font-black text-gray-700 uppercase tracking-tight mt-1">
                    {step.title}
                  </h5>
                </div>
              </div>
              
              {index < STEPS.length - 1 && (
                <div className="hidden sm:block flex-1 h-px bg-gray-100 mx-4" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 3. Stepper Form Container */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6 sm:p-10 min-h-[380px] flex flex-col justify-between">
          
          <div className="space-y-8">
            {/* STEP 1: PERSONAL DETAILS */}
            {currentStep === 0 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="border-b border-gray-50 pb-2">
                  <h4 className="text-md font-black text-gray-800 uppercase tracking-tight">
                    1. Student Personal Information
                  </h4>
                  <p className="text-xs text-gray-400 font-medium">Please enter legal names, biological details, and primary emails.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. John Doe"
                      className={cn(
                        "w-full px-5 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all",
                        errors.fullName && "border-red-200 bg-red-50/30"
                      )}
                      {...register("fullName", { required: "Full name is required" })}
                    />
                    {errors.fullName && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.fullName.message}</p>}
                  </div>

                  {/* Gender */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Gender *</label>
                    <select
                      className={cn(
                        "w-full px-5 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all appearance-none cursor-pointer",
                        errors.gender && "border-red-200 bg-red-50/30"
                      )}
                      {...register("gender", { required: "Gender is required" })}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    {errors.gender && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.gender.message}</p>}
                  </div>

                  {/* Date of Birth */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Date of Birth *</label>
                    <input
                      type="date"
                      className={cn(
                        "w-full px-5 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all",
                        errors.dob && "border-red-200 bg-red-50/30"
                      )}
                      {...register("dob", { required: "Date of birth is required" })}
                    />
                    {errors.dob && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.dob.message}</p>}
                  </div>

                  {/* Blood Group */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Blood Group</label>
                    <select
                      className="w-full px-5 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all appearance-none cursor-pointer"
                      {...register("bloodGroup")}
                    >
                      <option value="Unknown">Unknown</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Personal Email</label>
                    <input
                      type="text"
                      placeholder="john.doe@example.com"
                      className={cn(
                        "w-full px-5 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all",
                        errors.email && "border-red-200 bg-red-50/30"
                      )}
                      {...register("email", {
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: "Please enter a valid email format",
                        },
                      })}
                    />
                    {errors.email && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.email.message}</p>}
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Personal Phone</label>
                    <input
                      type="text"
                      placeholder="10-digit Phone number"
                      className="w-full px-5 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all"
                      onInput={(e) => {
                        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      }}
                      {...register("phone")}
                    />
                  </div>

                  {/* Cast */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cast / Category</label>
                    <select
                      className="w-full px-5 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all appearance-none cursor-pointer"
                      {...register("cast")}
                    >
                      <option value="">Select Category</option>
                      <option value="General">General</option>
                      <option value="OBC">OBC</option>
                      <option value="SC">SC</option>
                      <option value="ST">ST</option>
                    </select>
                  </div>

                  {/* Aadhar Number */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Aadhar Number</label>
                    <input
                      type="text"
                      placeholder="12-digit Aadhar No"
                      className="w-full px-5 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all"
                      onInput={(e) => {
                        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 12);
                      }}
                      {...register("aadhar")}
                    />
                  </div>

                   {/* Student Photo Section (Photo Link Only) */}
                   <div className="md:col-span-2 space-y-3 bg-gray-50/50 p-5 rounded-2xl border border-gray-100 mt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                      <div>
                        <label className="text-xs font-black text-gray-700 uppercase tracking-wider">
                          Student Photograph
                        </label>
                        <p className="text-[10px] text-gray-400 font-medium">
                          Paste Google Drive / public HTTPS image URL.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Student Photo URL (Google Drive / Public Image Link)
                      </label>
                      <input
                        type="url"
                        placeholder="https://drive.google.com/file/d/.../view or https://example.com/photo.jpg"
                        value={photoUrlInput}
                        onChange={(e) => handlePhotoUrlChange(e.target.value)}
                        maxLength={500}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-4 focus:ring-indigo-100"
                      />
                      {photoUrlError && (
                        <p className="text-[10px] font-bold text-rose-500">{photoUrlError}</p>
                      )}
                      <p className="text-[10px] text-gray-400 font-semibold">
                        Supports Google Drive public links & direct HTTPS image URLs.
                      </p>
                    </div>

                    {/* Live Image Preview */}
                    {photoPreview && (
                      <div className="flex items-center gap-3 pt-2">
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 bg-white shadow-2xs">
                          <img
                            src={photoPreview}
                            alt="Student Preview"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              setPhotoUrlError("Unable to load image. Please verify the image URL.");
                            }}
                            onLoad={() => setPhotoUrlError("")}
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-emerald-600">✓ Image Preview Loaded</span>
                          <button
                            type="button"
                            onClick={removePhoto}
                            className="text-[10px] font-bold text-rose-600 hover:underline text-left mt-0.5 cursor-pointer"
                          >
                            Remove Photo
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Custom Fields Panel */}
                <div className="mt-8 pt-6 border-t border-gray-50 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-black text-gray-800 uppercase tracking-tight flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
                        Additional Custom Fields
                      </h4>
                      <p className="text-[10px] text-gray-400 font-medium">Add dynamic information like Aadhar Card, Passport No, etc.</p>
                    </div>

                    {!isAddingField ? (
                      <button
                        type="button"
                        onClick={() => setIsAddingField(true)}
                        className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100/30 text-indigo-700 hover:text-indigo-800 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>Add Custom Field</span>
                      </button>
                    ) : null}
                  </div>

                  {/* Inline key entry block */}
                  {isAddingField && (
                    <div className="p-4 bg-gray-50/60 border border-gray-105 rounded-2xl flex flex-col sm:flex-row items-end gap-3.5 max-w-lg animate-in zoom-in-95 duration-200">
                      <div className="space-y-1.5 flex-1 w-full">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">New Field Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Aadhar Number"
                          value={newFieldKey}
                          onChange={(e) => setNewFieldKey(e.target.value)}
                          className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (!newFieldKey.trim()) {
                              addToast("Field name cannot be empty", "error");
                              return;
                            }
                            if (customFields.some(f => f.key.toLowerCase() === newFieldKey.trim().toLowerCase())) {
                              addToast("Field name already exists", "error");
                              return;
                            }
                            setCustomFields(prev => [...prev, { key: newFieldKey.trim(), value: "" }]);
                            setNewFieldKey("");
                            setIsAddingField(false);
                            addToast(`Field "${newFieldKey.trim()}" created!`);
                          }}
                          className="flex-1 sm:flex-initial px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl active:scale-95 transition-all cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingField(false);
                            setNewFieldKey("");
                          }}
                          className="flex-1 sm:flex-initial px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-500 text-xs font-bold rounded-xl active:scale-95 transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* List of Custom Inputs */}
                  {customFields.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/25 p-5 border border-dashed border-gray-100 rounded-3xl animate-in fade-in duration-300">
                      {customFields.map((field) => (
                        <div key={field.key} className="space-y-1.5 relative group animate-in slide-in-from-bottom-2 duration-200">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">
                            {field.key}
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder={`Enter ${field.key}...`}
                              value={field.value}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCustomFields(prev => prev.map(f => f.key === field.key ? { ...f, value: val } : f));
                              }}
                              className="flex-1 px-5 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-indigo-50/50 transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setCustomFields(prev => prev.filter(f => f.key !== field.key));
                                addToast(`Field "${field.key}" removed`);
                              }}
                              className="p-3 text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all active:scale-90 cursor-pointer"
                              title="Delete Field"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-gray-50/30 border border-dashed border-gray-100 rounded-2xl text-xs font-bold text-gray-400 italic">
                      No custom fields added yet.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: ACADEMIC DETAILS */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="border-b border-gray-50 pb-2">
                  <h4 className="text-md font-black text-gray-800 uppercase tracking-tight">
                    2. Academic Alignment & Classroom details
                  </h4>
                  <p className="text-xs text-gray-400 font-medium">Configure admission credentials, class assignments, and logistics.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Admission Number */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Admission Number *</label>
                      {!isEditMode && (
                        <span className="text-[10px] font-bold text-indigo-500">
                          {lastAdmissionNumber ? `(Last: ${lastAdmissionNumber} | Total: ${totalStudents})` : `(Total: ${totalStudents})`}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. ADM-2026-0044"
                      className={cn(
                        "w-full px-5 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all",
                        errors.admissionNumber && "border-red-200 bg-red-50/30"
                      )}
                      {...register("admissionNumber", { required: "Admission number is required" })}
                    />
                    {errors.admissionNumber && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.admissionNumber.message}</p>}
                  </div>

                  {/* Roll Number */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Roll Number *</label>
                    <input
                      type="text"
                      placeholder="e.g. 101"
                      className={cn(
                        "w-full px-5 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all",
                        errors.rollNumber && "border-red-200 bg-red-50/30"
                      )}
                      {...register("rollNumber", { required: "Roll number is required" })}
                    />
                    {errors.rollNumber && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.rollNumber.message}</p>}
                  </div>

                  {/* Hidden input to hold className for react-hook-form */}
                  <input type="hidden" {...register("className", { required: "Class name is required" })} />
                  <input type="hidden" {...register("section", { required: "Section is required" })} />

                  {/* Class Group Dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Class Group *</label>
                    <select
                      className={cn(
                        "w-full px-5 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all appearance-none cursor-pointer",
                        errors.className && "border-red-200 bg-red-50/30"
                      )}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) {
                          setValue("className", "", { shouldValidate: true });
                          setValue("section", "", { shouldValidate: true });
                        } else if (val.includes("-")) {
                          const [cls, sec] = val.split("-");
                          setValue("className", cls, { shouldValidate: true });
                          setValue("section", sec, { shouldValidate: true });
                        } else {
                          setValue("className", val, { shouldValidate: true });
                          setValue("section", "A", { shouldValidate: true });
                        }
                      }}
                      value={(() => {
                        const matches = classes.find(c => c.name === `${watchClassName}-${watchSection}` || c.name === watchClassName);
                        return matches ? matches.name : "";
                      })()}
                    >
                      <option value="">Select Class Group</option>
                      {classes.map((cls) => (
                        <option key={cls._id} value={cls.name}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                    {errors.className && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.className.message}</p>}
                  </div>

                  {/* Session */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Academic Session *</label>
                    <input
                      type="text"
                      placeholder="e.g. 2026-2027"
                      className={cn(
                        "w-full px-5 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all",
                        errors.session && "border-red-200 bg-red-50/30"
                      )}
                      {...register("session", { required: "Academic session is required" })}
                    />
                    {errors.session && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.session.message}</p>}
                  </div>

                  {/* Status */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Enrollment Status</label>
                    <select
                      className="w-full px-5 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all appearance-none cursor-pointer"
                      {...register("status")}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Suspended">Suspended</option>
                      <option value="Alumni">Alumni</option>
                    </select>
                  </div>

                  {/* Transport Mode */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Transport Mode</label>
                    <select
                      className="w-full px-5 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all appearance-none cursor-pointer"
                      {...register("transportMode")}
                    >
                      <option value="Private">Private</option>
                      <option value="School Bus">School Bus</option>
                      <option value="Self">Self</option>
                      <option value="Walking">Walking</option>
                    </select>
                  </div>

                  {/* Admission Date */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Admission Date *</label>
                    <input
                      type="date"
                      className={cn(
                        "w-full px-5 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all",
                        errors.admissionDate && "border-red-200 bg-red-50/30"
                      )}
                      {...register("admissionDate", { required: "Admission date is required" })}
                    />
                    {errors.admissionDate && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.admissionDate.message}</p>}
                  </div>

                  {/* Fee Discount */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fee Discount (%)</label>
                    <input
                      type="number"
                      placeholder="e.g. 10"
                      min="0"
                      max="100"
                      className={cn(
                        "w-full px-5 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all",
                        errors.discountPercentage && "border-red-200 bg-red-50/30"
                      )}
                      {...register("discountPercentage", {
                        min: { value: 0, message: "Discount cannot be negative" },
                        max: { value: 100, message: "Discount cannot exceed 100" }
                      })}
                    />
                    {errors.discountPercentage && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.discountPercentage.message}</p>}
                  </div>

                  {/* Previous School */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Previous School Details</label>
                    <input
                      type="text"
                      placeholder="e.g. Saint Mary Convent"
                      className="w-full px-5 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all"
                      {...register("previousSchool")}
                    />
                  </div>

                  {/* Hostel Required */}
                  <div className="flex items-center gap-3 md:col-span-3 md:pt-4 pl-1">
                    <input
                      type="checkbox"
                      id="hostelRequired"
                      className="w-5 h-5 rounded-lg border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      {...register("hostelRequired")}
                    />
                    <label htmlFor="hostelRequired" className="text-xs font-bold text-gray-600 select-none cursor-pointer">
                      Hostel Accommodations Required
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: PARENT DETAILS */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="border-b border-gray-50 pb-2">
                  <h4 className="text-md font-black text-gray-800 uppercase tracking-tight">
                    3. Parent / Guardian Guardianship credentials
                  </h4>
                  <p className="text-xs text-gray-400 font-medium">Provide emergency contact references and parental information.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Father's Name */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Father's Name *</label>
                    <input
                      type="text"
                      placeholder="Father's full name"
                      className={cn(
                        "w-full px-5 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all",
                        errors.fatherName && "border-red-200 bg-red-50/30"
                      )}
                      {...register("fatherName", { required: "Father's name is required" })}
                    />
                    {errors.fatherName && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.fatherName.message}</p>}
                  </div>

                  {/* Mother's Name */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mother's Name *</label>
                    <input
                      type="text"
                      placeholder="Mother's full name"
                      className={cn(
                        "w-full px-5 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all",
                        errors.motherName && "border-red-200 bg-red-50/30"
                      )}
                      {...register("motherName", { required: "Mother's name is required" })}
                    />
                    {errors.motherName && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.motherName.message}</p>}
                  </div>

                  {/* Emergency Contact */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Emergency Contact Number *</label>
                    <input
                      type="text"
                      placeholder="Primary phone number (10 digits)"
                      className={cn(
                        "w-full px-5 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all",
                        errors.emergencyContact && "border-red-200 bg-red-50/30"
                      )}
                      onInput={(e) => {
                        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      }}
                      {...register("emergencyContact", {
                        required: "Emergency contact is required",
                        pattern: {
                          value: /^\d{10}$/,
                          message: "Please enter a valid 10-digit contact number",
                        },
                      })}
                    />
                    {errors.emergencyContact && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.emergencyContact.message}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: ADDRESS DETAILS & PHOTO UPLOAD */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="border-b border-gray-50 pb-2">
                  <h4 className="text-md font-black text-gray-800 uppercase tracking-tight">
                    4. Permanent Address & Student Portrait
                  </h4>
                  <p className="text-xs text-gray-400 font-medium">Verify structural address files and upload drag-and-drop imagery.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                  {/* Address Area */}
                  <div className="md:col-span-7 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Residential Address *</label>
                      <textarea
                        rows={6}
                        placeholder="House/Plot no., Street name, City, State, Country, Postal Code..."
                        className={cn(
                          "w-full px-5 py-4 bg-gray-50/50 border border-gray-100 rounded-3xl text-sm font-semibold outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all resize-none",
                          errors.address && "border-red-200 bg-red-50/30"
                        )}
                        {...register("address", { required: "Residential address is required" })}
                      />
                      {errors.address && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.address.message}</p>}
                    </div>
                  </div>

                  {/* Drag and Drop Zone Area */}
                  <div className="md:col-span-5 space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Student Photo Portrait</label>
                    
                    {photoPreview ? (
                      /* Live Image Preview Mode */
                      <div className="relative border border-indigo-100 rounded-3xl p-2 bg-indigo-50/20 overflow-hidden flex flex-col items-center justify-center group h-44">
                        <img
                          src={photoPreview}
                          alt="Student Portrait preview"
                          className="h-full rounded-2xl object-cover"
                        />
                        <button
                          type="button"
                          onClick={removePhoto}
                          className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-sm text-rose-600 rounded-full hover:bg-rose-50 border border-gray-100 shadow-md transition-all active:scale-90"
                          title="Remove Photo"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      /* Drag & Drop Upload Zone */
                      <div
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        className={cn(
                          "border-2 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 h-44 group",
                          isDragActive
                            ? "border-indigo-600 bg-indigo-50/30 scale-98"
                            : "border-gray-200 hover:border-indigo-500 hover:bg-gray-50/40"
                        )}
                        onClick={() => document.getElementById("file-upload").click()}
                      >
                        <input
                          id="file-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                        <UploadCloud className={cn("w-10 h-10 transition-transform duration-300 group-hover:-translate-y-1", isDragActive ? "text-indigo-600" : "text-gray-400")} />
                        <span className="text-xs font-bold text-gray-700 mt-3 block">
                          Drag & drop portrait photo, or <span className="text-indigo-600 underline">browse</span>
                        </span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight mt-1.5 leading-none block">
                          Supports JPEG, PNG, WEBP (Max 2MB)
                        </span>
                      </div>
                    )}
                    {photoError && (
                      <p className="text-[10px] text-red-500 font-bold ml-1">{photoError}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stepper Navigation Actions */}
          <div className="flex items-center justify-between border-t border-gray-50 pt-8 mt-10">
            <div>
              {currentStep > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  icon={ChevronLeft}
                  className="h-12 rounded-2xl px-5 text-xs font-bold border border-gray-100 hover:bg-gray-50"
                  onClick={handleBack}
                >
                  Previous Step
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                className="h-12 rounded-2xl px-5 text-xs"
                onClick={() => navigate("/students")}
              >
                Cancel
              </Button>
              
              {currentStep < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="h-12 rounded-2xl px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <span>Next Step</span>
                  <ChevronRight size={14} />
                </button>
              ) : (
                <Button
                  type="submit"
                  icon={Save}
                  loading={loading}
                  className="h-12 rounded-2xl px-7 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100"
                >
                  {isEditMode ? "Save Changes" : "Submit Registration"}
                </Button>
              )}
            </div>
          </div>

        </div>
      </form>
    </div>
  );
};

export default AddStudent;
