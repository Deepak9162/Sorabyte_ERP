import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  User,
  GraduationCap,
  Users,
  MapPin,
  FileText,
  Upload,
  ArrowLeft,
  ArrowRight,
  Save,
  CheckCircle,
  X,
  UploadCloud
} from "lucide-react";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { useToast } from "../../context/ToastContext";
import { cn } from "../../utils/cn";
import api from "../../services/api";

const STEPS = [
  { id: 1, title: "Personal Details", icon: User },
  { id: 2, title: "Academic & Logistics", icon: GraduationCap },
  { id: 3, title: "Parent Details", icon: Users },
  { id: 4, title: "Address & Portrait", icon: MapPin },
  { id: 5, title: "Review & Submit", icon: FileText },
];

const AdmissionRequestForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();

  const isEditMode = !!id;
  const duplicateData = location.state?.duplicateData;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [isDragActive, setIsDragActive] = useState(false);

  // Redesigned form state to match AddStudent.jsx fields exactly
  const [studentInfo, setStudentInfo] = useState({
    fullName: "",
    gender: "Male",
    dob: "",
    bloodGroup: "Unknown",
    email: "",
    phone: "",
    category: "General",
    aadhar: "",
    admissionClass: "",
    section: "A",
    session: "2026-2027",
    status: "Active",
    transportMode: "Private",
    admissionDate: new Date().toISOString().split("T")[0],
    discountPercentage: 0,
    previousSchool: "",
   
    studentPhoto: "",
  });

  const [parentInfo, setParentInfo] = useState({
    fatherName: "",
    motherName: "",
  });

  const [address, setAddress] = useState({
    residentialAddress: "",
  });

  const [emergencyContact, setEmergencyContact] = useState({
    phone: "",
  });

  // File Upload State
  const [files, setFiles] = useState({
    studentPhoto: null,
  });

  // Previews
  const [previews, setPreviews] = useState({
    studentPhoto: "",
  });

  // Fetch classes on mount (Teacher/Admin fetching all classes)
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get("/admin/classes?all=true");
        if (res.data.success) {
          const classData = res.data.data || [];
          setClasses(classData);
          if (classData.length > 0 && !studentInfo.admissionClass) {
            const firstClass = classData[0];
            const className = firstClass && firstClass.name ? firstClass.name.split("-")[0] : "";
            if (className) {
              setStudentInfo(prev => ({ ...prev, admissionClass: className }));
            }
          }
        }
      } catch (error) {
        console.error("Error fetching classes:", error);
      }
    };
    fetchClasses();
  }, []);

  // Pre-fill duplicate or edit data
  useEffect(() => {
    if (duplicateData) {
      // Map existing nested structure back into our flattened states
      setStudentInfo({
        fullName: duplicateData.studentInfo?.fullName || "",
        gender: duplicateData.studentInfo?.gender || "Male",
        dob: duplicateData.studentInfo?.dob ? duplicateData.studentInfo.dob.split("T")[0] : "",
        bloodGroup: duplicateData.studentInfo?.bloodGroup || "Unknown",
        email: duplicateData.parentInfo?.email || "",
        phone: duplicateData.parentInfo?.phone || "",
        category: duplicateData.studentInfo?.category || "General",
        aadhar: duplicateData.studentInfo?.aadhar || "",
        admissionClass: duplicateData.studentInfo?.admissionClass || "",
        section: duplicateData.studentInfo?.section || "A",
        session: "2026-2027",
        status: "Active",
        transportMode: duplicateData.transport?.busRequired ? "School Bus" : "Private",
        admissionDate: new Date().toISOString().split("T")[0],
        discountPercentage: 0,
        previousSchool: duplicateData.studentInfo?.previousSchool || "",
      
        studentPhoto: duplicateData.studentInfo?.studentPhoto || "",
      });

      setParentInfo({
        fatherName: duplicateData.parentInfo?.fatherName || "",
        motherName: duplicateData.parentInfo?.motherName || "",
      });

      setAddress({
        residentialAddress: duplicateData.address?.currentAddress || duplicateData.address?.permanentAddress || "",
      });

      setEmergencyContact({
        phone: duplicateData.emergencyContact?.phone || "",
      });

      if (duplicateData.studentInfo?.studentPhoto) {
        setPreviews({
          studentPhoto: `${api.defaults.baseURL.replace('/api', '')}${duplicateData.studentInfo.studentPhoto}`
        });
      }
      addToast("Form pre-filled with selected request details", "info");
    } else if (isEditMode) {
      const fetchRequestDetails = async () => {
        setLoading(true);
        try {
          const res = await api.get(`/admission-requests/${id}`);
          if (res.data.success) {
            const data = res.data.data;
            // Parse remarks or comment info if possible, else default
            let sessVal = "2026-2027";
            let discVal = 0;
            let dateVal = new Date().toISOString().split("T")[0];
            
            if (data.additionalNotes?.remarks) {
              const rem = data.additionalNotes.remarks;
              const sessMatch = rem.match(/Academic Session:\s*([^\s|]+)/);
              if (sessMatch) sessVal = sessMatch[1];
              const discMatch = rem.match(/Discount:\s*(\d+)%/);
              if (discMatch) discVal = parseInt(discMatch[1], 10);
              const dateMatch = rem.match(/Admission Date:\s*([^\s|]+)/);
              if (dateMatch) dateVal = dateMatch[1];
            }

            setStudentInfo({
              fullName: data.studentInfo?.fullName || "",
              gender: data.studentInfo?.gender || "Male",
              dob: data.studentInfo?.dob ? data.studentInfo.dob.split("T")[0] : "",
              bloodGroup: data.studentInfo?.bloodGroup || "Unknown",
              email: data.parentInfo?.email || "",
              phone: data.parentInfo?.phone || "",
              category: data.studentInfo?.category || "General",
              aadhar: data.studentInfo?.aadhar || "",
              admissionClass: data.studentInfo?.admissionClass || "",
              section: data.studentInfo?.section || "A",
              session: sessVal,
              status: data.studentInfo?.status || "Active",
              transportMode: data.transport?.busRequired ? "School Bus" : "Private",
              admissionDate: dateVal,
              discountPercentage: discVal,
              previousSchool: data.studentInfo?.previousSchool || "",
             
              studentPhoto: data.studentInfo?.studentPhoto || "",
            });

            setParentInfo({
              fatherName: data.parentInfo?.fatherName || "",
              motherName: data.parentInfo?.motherName || "",
            });

            setAddress({
              residentialAddress: data.address?.currentAddress || data.address?.permanentAddress || "",
            });

            setEmergencyContact({
              phone: data.emergencyContact?.phone || "",
            });

            if (data.studentInfo?.studentPhoto) {
              setPreviews({
                studentPhoto: `${api.defaults.baseURL.replace('/api', '')}${data.studentInfo.studentPhoto}`
              });
            }
          }
        } catch (err) {
          addToast("Failed to load details for editing", "error");
        } finally {
          setLoading(false);
        }
      };
      fetchRequestDetails();
    }
  }, [id, duplicateData, isEditMode]);

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
      processPhotoFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileElementChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processPhotoFile(e.target.files[0]);
    }
  };

  const processPhotoFile = (file) => {
    if (file.size > 2 * 1024 * 1024) {
      addToast("Portrait file size must not exceed 2MB", "error");
      return;
    }
    const ext = file.name.split('.').pop().toLowerCase();
    const allowed = ['jpg', 'jpeg', 'png', 'webp'];
    if (!allowed.includes(ext)) {
      addToast("Only JPG, JPEG, PNG, and WEBP formats are allowed", "error");
      return;
    }

    setFiles(prev => ({ ...prev, studentPhoto: file }));

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviews(prev => ({ ...prev, studentPhoto: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setFiles(prev => ({ ...prev, studentPhoto: null }));
    setPreviews(prev => ({ ...prev, studentPhoto: "" }));
    setStudentInfo(prev => ({ ...prev, studentPhoto: "" }));
  };

  // Validations per step
  const validateStep = () => {
    if (step === 1) {
      if (!studentInfo.fullName.trim()) return "Student Full Name is required";
      if (!studentInfo.dob) return "Date of Birth is required";
      if (new Date(studentInfo.dob) > new Date()) return "Date of birth cannot be in the future";
    }
    if (step === 2) {
      if (!studentInfo.admissionClass) return "Admission Class is required";
      if (!studentInfo.session.trim()) return "Academic Session is required";
      if (!studentInfo.admissionDate) return "Admission Date is required";
      const disc = Number(studentInfo.discountPercentage);
      if (isNaN(disc) || disc < 0 || disc > 100) return "Discount percentage must be between 0 and 100";
    }
    if (step === 3) {
      if (!parentInfo.fatherName.trim()) return "Father's Name is required";
      if (!parentInfo.motherName.trim()) return "Mother's Name is required";
      if (!emergencyContact.phone.trim()) return "Emergency Contact Number is required";
      if (!/^\d{10,15}$/.test(emergencyContact.phone.trim())) {
        return "Emergency contact number must be a valid 10-15 digit number";
      }
    }
    if (step === 4) {
      if (!address.residentialAddress.trim()) return "Residential Address is required";
    }
    return null;
  };

  const handleNext = () => {
    const errorMsg = validateStep();
    if (errorMsg) {
      addToast(errorMsg, "warning");
      return;
    }
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  // Map the flattened state values into the schema format
  const compileRequestBody = (requestStatus = "Draft") => {
    return {
      status: requestStatus,
      studentInfo: {
        fullName: studentInfo.fullName.trim(),
        gender: studentInfo.gender,
        dob: studentInfo.dob,
        admissionClass: studentInfo.admissionClass,
        section: studentInfo.section || "A",
        bloodGroup: studentInfo.bloodGroup,
        category: studentInfo.category,
        religion: "Other", // defaults
        nationality: "Indian",
        aadhar: studentInfo.aadhar.trim(),
        previousSchool: studentInfo.previousSchool.trim(),
        studentPhoto: studentInfo.studentPhoto,
      },
      parentInfo: {
        fatherName: parentInfo.fatherName.trim(),
        motherName: parentInfo.motherName.trim(),
        phone: studentInfo.phone.trim(),
        email: studentInfo.email.trim(),
      },
      address: {
        currentAddress: address.residentialAddress.trim(),
        permanentAddress: address.residentialAddress.trim(),
      },
      emergencyContact: {
        contactPerson: "Emergency Contact",
        relationship: "Parent/Guardian",
        phone: emergencyContact.phone.trim(),
      },
      transport: {
        busRequired: studentInfo.transportMode === "School Bus",
      },
   
      additionalNotes: {
        remarks: `Academic Session: ${studentInfo.session.trim()} | Status: ${studentInfo.status} | Discount: ${studentInfo.discountPercentage}% | Admission Date: ${studentInfo.admissionDate}`,
        teacherComments: `Created by teacher. Session: ${studentInfo.session.trim()}`
      }
    };
  };

  const saveRequest = async (requestStatus = "Draft") => {
    const errorMsg = validateStep();
    if (errorMsg) {
      addToast(errorMsg, "warning");
      return;
    }

    setLoading(true);
    try {
      const payload = compileRequestBody(requestStatus);
      
      const formData = new FormData();
      formData.append("status", payload.status);
      formData.append("studentInfo", JSON.stringify(payload.studentInfo));
      formData.append("parentInfo", JSON.stringify(payload.parentInfo));
      formData.append("address", JSON.stringify(payload.address));
      formData.append("emergencyContact", JSON.stringify(payload.emergencyContact));
      formData.append("transport", JSON.stringify(payload.transport));
     
      formData.append("additionalNotes", JSON.stringify(payload.additionalNotes));

      if (files.studentPhoto) {
        formData.append("studentPhoto", files.studentPhoto);
      }

      let res;
      if (isEditMode) {
        res = await api.put(`/admission-requests/${id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      } else {
        res = await api.post("/admission-requests", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      }

      if (res.data.success) {
        addToast(
          isEditMode 
            ? `Admission request draft updated successfully!` 
            : `New admission request ${requestStatus === 'Submitted' ? 'submitted' : 'draft saved'} successfully!`, 
          "success"
        );
        navigate("/admissions/requests");
      }
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.message || "Failed to process admission request", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Back button & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <button
            onClick={() => navigate("/admissions/requests")}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-500 hover:text-indigo-600 transition-colors mb-3"
          >
            <ArrowLeft size={14} /> Back to Directory
          </button>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-none">
            {isEditMode ? "Edit Admission Request" : "New Admission Request"}
          </h2>
          <p className="text-xs font-semibold text-gray-400 mt-2">
            Submit dossiers for target students to be reviewed and approved by the administration.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            className="h-11 rounded-xl px-4 text-xs font-black uppercase tracking-widest border border-gray-200"
            onClick={() => saveRequest("Draft")}
            loading={loading}
          >
            <Save size={16} /> Save Draft
          </Button>
          <Button
            className="h-11 rounded-xl px-5 text-xs font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700"
            onClick={() => saveRequest("Submitted")}
            loading={loading}
          >
            <CheckCircle size={16} /> Submit Request
          </Button>
        </div>
      </div>

      {/* Dynamic Stepper */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm mb-8 overflow-x-auto">
        <div className="flex justify-between items-center min-w-[700px] px-4">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isCompleted = step > s.id;
            
            return (
              <React.Fragment key={s.id}>
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center border transition-all duration-300 font-black text-xs",
                      isCompleted && "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100",
                      isActive && "bg-white border-indigo-600 text-indigo-700 font-black scale-105 shadow-md shadow-indigo-50",
                      !isActive && !isCompleted && "bg-white border-gray-200 text-gray-400"
                    )}
                  >
                    {isCompleted ? <CheckCircle size={16} /> : <Icon size={16} />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Step {s.id}</span>
                    <span
                      className={cn(
                        "text-xs font-black",
                        isActive ? "text-gray-900" : "text-gray-400"
                      )}
                    >
                      {s.title}
                    </span>
                  </div>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-[2px] mx-4 transition-all duration-500",
                      step > s.id ? "bg-indigo-600" : "bg-gray-100"
                    )}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Form Fields Container */}
      <div className="bg-white p-8 sm:p-12 rounded-[2.5rem] border border-gray-100 shadow-sm min-h-[400px]">
        {/* STEP 1: PERSONAL DETAILS */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="border-b border-gray-50 pb-3">
              <h3 className="text-lg font-black text-gray-800 tracking-tight uppercase">1. Personal Information</h3>
              <p className="text-xs text-gray-400 font-medium">Please enter student's basic details.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Full Name *"
                placeholder="Enter student's full name"
                value={studentInfo.fullName}
                onChange={(e) => setStudentInfo({ ...studentInfo, fullName: e.target.value })}
              />

              <div className="space-y-2">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Gender *</label>
                <select
                  value={studentInfo.gender}
                  onChange={(e) => setStudentInfo({ ...studentInfo, gender: e.target.value })}
                  className="w-full bg-white border border-gray-200 text-gray-900 text-sm font-semibold rounded-2xl p-4 outline-none focus:border-indigo-600 transition-all focus:ring-4 focus:ring-indigo-50"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <Input
                label="Date of Birth *"
                type="date"
                value={studentInfo.dob}
                onChange={(e) => setStudentInfo({ ...studentInfo, dob: e.target.value })}
              />

              <div className="space-y-2">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Blood Group</label>
                <select
                  value={studentInfo.bloodGroup}
                  onChange={(e) => setStudentInfo({ ...studentInfo, bloodGroup: e.target.value })}
                  className="w-full bg-white border border-gray-200 text-gray-900 text-sm font-semibold rounded-2xl p-4 outline-none focus:border-indigo-600 transition-all focus:ring-4 focus:ring-indigo-50"
                >
                  {['Unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

              <Input
                label="Personal Email"
                placeholder="student@example.com"
                value={studentInfo.email}
                onChange={(e) => setStudentInfo({ ...studentInfo, email: e.target.value })}
              />

              <Input
                label="Personal Phone"
                placeholder="10-digit Phone number"
                value={studentInfo.phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setStudentInfo({ ...studentInfo, phone: val });
                }}
              />

              <div className="space-y-2">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Category / Cast</label>
                <select
                  value={studentInfo.category}
                  onChange={(e) => setStudentInfo({ ...studentInfo, category: e.target.value })}
                  className="w-full bg-white border border-gray-200 text-gray-900 text-sm font-semibold rounded-2xl p-4 outline-none focus:border-indigo-600 transition-all focus:ring-4 focus:ring-indigo-50"
                >
                  <option value="General">General</option>
                  <option value="OBC">OBC</option>
                  <option value="SC">SC</option>
                  <option value="ST">ST</option>
                </select>
              </div>

              <Input
                label="Aadhaar Number"
                placeholder="12-digit Aadhaar No"
                value={studentInfo.aadhar}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 12);
                  setStudentInfo({ ...studentInfo, aadhar: val });
                }}
              />
            </div>
          </div>
        )}

        {/* STEP 2: ACADEMIC DETAILS */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="border-b border-gray-50 pb-3">
              <h3 className="text-lg font-black text-gray-800 tracking-tight uppercase">2. Academic & Logistics</h3>
              <p className="text-xs text-gray-400 font-medium">Select class alignment and other enrollment details.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Class Group *</label>
                <select
                  value={studentInfo.admissionClass}
                  onChange={(e) => setStudentInfo({ ...studentInfo, admissionClass: e.target.value })}
                  className="w-full bg-white border border-gray-200 text-gray-900 text-sm font-semibold rounded-2xl p-4 outline-none focus:border-indigo-600 transition-all focus:ring-4 focus:ring-indigo-50"
                >
                  <option value="">Select Class Group</option>
                  {classes.map(c => {
                    const className = c && c.name ? c.name.split("-")[0] : "";
                    return (
                      <option key={c._id} value={className}>{c.name}</option>
                    );
                  })}
                </select>
              </div>

              <Input
                label="Section (optional)"
                placeholder="A, B, C etc."
                value={studentInfo.section}
                onChange={(e) => setStudentInfo({ ...studentInfo, section: e.target.value })}
              />

              <Input
                label="Academic Session *"
                placeholder="2026-2027"
                value={studentInfo.session}
                onChange={(e) => setStudentInfo({ ...studentInfo, session: e.target.value })}
              />

              <div className="space-y-2">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Status</label>
                <select
                  value={studentInfo.status}
                  onChange={(e) => setStudentInfo({ ...studentInfo, status: e.target.value })}
                  className="w-full bg-white border border-gray-200 text-gray-900 text-sm font-semibold rounded-2xl p-4 outline-none focus:border-indigo-600 transition-all focus:ring-4 focus:ring-indigo-50"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Alumni">Alumni</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Transport Mode</label>
                <select
                  value={studentInfo.transportMode}
                  onChange={(e) => setStudentInfo({ ...studentInfo, transportMode: e.target.value })}
                  className="w-full bg-white border border-gray-200 text-gray-900 text-sm font-semibold rounded-2xl p-4 outline-none focus:border-indigo-600 transition-all focus:ring-4 focus:ring-indigo-50"
                >
                  <option value="Private">Private</option>
                  <option value="School Bus">School Bus</option>
                  <option value="Self">Self</option>
                  <option value="Walking">Walking</option>
                </select>
              </div>

              <Input
                label="Admission Date *"
                type="date"
                value={studentInfo.admissionDate}
                onChange={(e) => setStudentInfo({ ...studentInfo, admissionDate: e.target.value })}
              />

              <Input
                label="Fee Discount (%)"
                type="number"
                min="0"
                max="100"
                placeholder="Discount"
                value={studentInfo.discountPercentage}
                onChange={(e) => setStudentInfo({ ...studentInfo, discountPercentage: e.target.value })}
              />

              <div className="md:col-span-2">
                <Input
                  label="Previous School Details"
                  placeholder="Saint Mary Convent"
                  value={studentInfo.previousSchool}
                  onChange={(e) => setStudentInfo({ ...studentInfo, previousSchool: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-3 md:col-span-3 pt-4 pl-1">
               
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: PARENT DETAILS */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="border-b border-gray-50 pb-3">
              <h3 className="text-lg font-black text-gray-800 tracking-tight uppercase">3. Parent Details</h3>
              <p className="text-xs text-gray-400 font-medium">Please enter emergency contact reference and parental details.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Father's Name *"
                placeholder="Father's full name"
                value={parentInfo.fatherName}
                onChange={(e) => setParentInfo({ ...parentInfo, fatherName: e.target.value })}
              />

              <Input
                label="Mother's Name *"
                placeholder="Mother's full name"
                value={parentInfo.motherName}
                onChange={(e) => setParentInfo({ ...parentInfo, motherName: e.target.value })}
              />

              <div className="md:col-span-2">
                <Input
                  label="Emergency Contact Number *"
                  placeholder="Primary contact (10 digits)"
                  value={emergencyContact.phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setEmergencyContact({ ...emergencyContact, phone: val });
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: ADDRESS & PHOTO */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="border-b border-gray-50 pb-3">
              <h3 className="text-lg font-black text-gray-800 tracking-tight uppercase">4. Permanent Address & Student Portrait</h3>
              <p className="text-xs text-gray-400 font-medium">Verify structural residential details and upload portrait imagery.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              <div className="md:col-span-7 space-y-2">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Residential Address *</label>
                <textarea
                  rows={6}
                  placeholder="House/Plot no., Street name, City, State, Country, Postal Code..."
                  value={address.residentialAddress}
                  onChange={(e) => setAddress({ ...address, residentialAddress: e.target.value })}
                  className="w-full bg-white border border-gray-200 text-gray-900 text-sm font-semibold rounded-[2rem] p-5 outline-none focus:border-indigo-600 transition-all focus:ring-4 focus:ring-indigo-50/50 resize-none"
                />
              </div>

              {/* Photo Upload Zone */}
              <div className="md:col-span-5 space-y-2">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Student Photo Portrait</label>
                
                {previews.studentPhoto ? (
                  <div className="relative border border-indigo-100 rounded-[2rem] p-2 bg-indigo-50/20 overflow-hidden flex flex-col items-center justify-center group h-44">
                    <img
                      src={previews.studentPhoto}
                      alt="Student portrait preview"
                      className="h-full rounded-2xl object-cover"
                    />
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-sm text-rose-600 rounded-full hover:bg-rose-50 border border-gray-100 shadow-md transition-all active:scale-90"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById("portrait-picker").click()}
                    className={cn(
                      "border-2 border-dashed rounded-[2rem] p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 h-44 group",
                      isDragActive
                        ? "border-indigo-600 bg-indigo-50/30 scale-98"
                        : "border-gray-200 hover:border-indigo-500 hover:bg-gray-50/40"
                    )}
                  >
                    <input
                      id="portrait-picker"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileElementChange}
                    />
                    <UploadCloud className={cn("w-10 h-10 transition-transform duration-300 group-hover:-translate-y-1", isDragActive ? "text-indigo-600" : "text-gray-400")} />
                    <span className="text-xs font-bold text-gray-700 mt-3 block">
                      Drag & drop portrait, or <span className="text-indigo-600 underline">browse</span>
                    </span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight mt-1.5 leading-none block">
                      Supports JPEG, PNG, WEBP (Max 2MB)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: REVIEW */}
        {step === 5 && (
          <div className="space-y-8">
            <div className="border-b border-gray-50 pb-3">
              <h3 className="text-lg font-black text-gray-800 tracking-tight uppercase">5. Review & Submit</h3>
              <p className="text-xs text-gray-400 font-medium">Verify all information before submitting the request.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Personal details */}
              <div className="bg-gray-50/40 p-6 rounded-[2rem] border border-gray-100 space-y-4">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-2">Student Dossier</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Full Name</span>
                    <strong className="text-gray-800">{studentInfo.fullName}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Gender</span>
                    <strong className="text-gray-700">{studentInfo.gender}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Date of Birth</span>
                    <strong className="text-gray-700">{studentInfo.dob}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Category / Cast</span>
                    <strong className="text-gray-700">{studentInfo.category}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Email / Phone</span>
                    <strong className="text-gray-700">{studentInfo.email || "N/A"} / {studentInfo.phone || "N/A"}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Aadhaar Card No</span>
                    <strong className="text-gray-700">{studentInfo.aadhar || "Not Provided"}</strong>
                  </div>
                </div>
              </div>

              {/* Right Column: Academic details */}
              <div className="bg-gray-50/40 p-6 rounded-[2rem] border border-gray-100 space-y-4">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-2">Academic & Logistics</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Class & Section</span>
                    <strong className="text-indigo-600">Class {studentInfo.admissionClass} - {studentInfo.section}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Session</span>
                    <strong className="text-gray-700">{studentInfo.session}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Transport Mode</span>
                    <strong className="text-gray-700">{studentInfo.transportMode}</strong>
                  </div>
                  <div>
                    
                   
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Admission Date</span>
                    <strong className="text-gray-700">{studentInfo.admissionDate}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Fee Discount</span>
                    <strong className="text-gray-700">{studentInfo.discountPercentage}%</strong>
                  </div>
                </div>
              </div>

              {/* Parent & Emergency Details */}
              <div className="bg-gray-50/40 p-6 rounded-[2rem] border border-gray-100 space-y-4 md:col-span-2">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-2">Parent & Address Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Father's Name</span>
                    <strong className="text-gray-700">{parentInfo.fatherName}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Mother's Name</span>
                    <strong className="text-gray-700">{parentInfo.motherName}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Emergency Contact</span>
                    <strong className="text-gray-700">{emergencyContact.phone}</strong>
                  </div>
                  <div className="sm:col-span-3">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Residential Address</span>
                    <p className="text-xs text-gray-700 font-semibold mt-1 leading-relaxed bg-white border border-gray-100 rounded-xl p-3">
                      {address.residentialAddress}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stepper Navigation Buttons */}
        <div className="flex justify-between items-center border-t border-gray-50 pt-8 mt-8">
          <div>
            {step > 1 && (
              <Button
                variant="secondary"
                icon={ArrowLeft}
                className="h-12 rounded-xl text-xs font-black uppercase tracking-widest border border-gray-200"
                onClick={handleBack}
                loading={loading}
              >
                Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              className="h-12 rounded-xl text-xs font-black uppercase tracking-widest border border-gray-200"
              onClick={() => navigate("/admissions/requests")}
              disabled={loading}
            >
              Cancel
            </Button>
            
            {step < STEPS.length ? (
              <Button
                className="h-12 rounded-xl text-xs font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 flex items-center gap-1"
                onClick={handleNext}
                loading={loading}
              >
                Next <ArrowRight size={16} />
              </Button>
            ) : (
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  className="h-12 rounded-xl text-xs font-black uppercase tracking-widest bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100"
                  onClick={() => saveRequest("Draft")}
                  loading={loading}
                >
                  <Save size={16} /> Save Draft
                </Button>
                <Button
                  className="h-12 rounded-xl text-xs font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 flex items-center gap-1.5"
                  onClick={() => saveRequest("Submitted")}
                  loading={loading}
                >
                  <CheckCircle size={16} /> Submit Dossier
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdmissionRequestForm;
