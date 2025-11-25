import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const IMAGE_BASE_URL = 'https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/members-images'

function RegistrationForm({ member, onComplete }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    position: '',
    email: '',
    phone: '',
    dob: '',
    school: '',
    city: '',
    state: '',
    linkedin: '',
    instagram: '',
    additionalInfo: ''
  })
  const [profileImage, setProfileImage] = useState(null)
  const [profileImagePreview, setProfileImagePreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Prefill form with existing member data (only once on mount)
  useEffect(() => {
    if (member && !formData.firstName && !formData.lastName) {
      setFormData({
        firstName: member.first_name || '',
        lastName: member.last_name || '',
        position: member.role || '',
        email: member.email || '',
        phone: member.phone ? String(member.phone).replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3') : '',
        dob: member.dob || '',
        school: member.school_name || '',
        city: member.city || '',
        state: member.state || '',
        linkedin: member.linkedin || '',
        instagram: member.instagram || '',
        additionalInfo: member.notes || ''
      })

      // Set profile image preview if exists
      if (member.image) {
        setProfileImagePreview(`${IMAGE_BASE_URL}/${member.image}`)
      }
    }
  }, [member?.member_id]) // Only run when member_id changes, not on every render

  const handleChange = (e) => {
    const { name, value } = e.target
    let processedValue = value
    
    // Format phone number as user types
    if (name === 'phone') {
      const digits = value.replace(/\D/g, '')
      if (digits.length <= 10) {
        if (digits.length <= 3) {
          processedValue = digits
        } else if (digits.length <= 6) {
          processedValue = `(${digits.slice(0, 3)}) ${digits.slice(3)}`
        } else {
          processedValue = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
        }
      } else {
        processedValue = formData.phone // Keep previous value if too long
      }
    }
    
    // Convert state to uppercase
    if (name === 'state') {
      processedValue = value.toUpperCase().slice(0, 2)
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }))
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.')
      return
    }

    // Validate file size (10 MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be less than 10 MB.')
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setProfileImagePreview(reader.result)
    }
    reader.readAsDataURL(file)

    setProfileImage(file)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')

    // Validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || 
        !formData.dob || !formData.school || !formData.city || !formData.state) {
      setError('Please fill in all required fields.')
      setSubmitting(false)
      return
    }

    // Validate phone format
    const phoneDigits = formData.phone.replace(/\D/g, '')
    if (phoneDigits.length !== 10) {
      setError('Please enter a valid 10-digit phone number.')
      setSubmitting(false)
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address.')
      setSubmitting(false)
      return
    }

    // Validate state abbreviation (2 letters)
    if (formData.state.length !== 2) {
      setError('State must be a 2-letter abbreviation (e.g., OH, TX).')
      setSubmitting(false)
      return
    }

    // Profile image is required
    if (!profileImage && !member?.image) {
      setError('Please upload a profile photo.')
      setSubmitting(false)
      return
    }

    try {
      let imagePath = member?.image || null

      // Upload profile image if new one is provided
      if (profileImage) {
        const fileExt = profileImage.name.split('.').pop()
        const fileName = `${member.member_id}.${fileExt}`
        const filePath = fileName

        const { error: uploadError } = await supabase.storage
          .from('members-images')
          .upload(filePath, profileImage, {
            cacheControl: '3600',
            upsert: true
          })

        if (uploadError) {
          console.error('Image upload error:', uploadError)
          setError('Failed to upload profile photo. Please try again.')
          setSubmitting(false)
          return
        }

        imagePath = filePath
      }

      // Update member record using database function (bypasses RLS)
      const { data: updateResult, error: updateError } = await supabase.rpc('update_member_registration', {
        p_member_id: member.member_id,
        p_first_name: formData.firstName.trim(),
        p_last_name: formData.lastName.trim(),
        p_role: formData.position.trim() || null,
        p_email: formData.email.trim().toLowerCase(),
        p_phone: phoneDigits || null,
        p_dob: formData.dob,
        p_school_name: formData.school.trim(),
        p_city: formData.city.trim(),
        p_state: formData.state.trim().toUpperCase(),
        p_linkedin: formData.linkedin.trim() || null,
        p_instagram: formData.instagram.trim() || null,
        p_notes: formData.additionalInfo.trim() || null,
        p_image: imagePath,
        p_registration_complete: true
      })

      if (updateError) {
        console.error('Member update error:', updateError)
        setError('Failed to save registration. Please try again.')
        setSubmitting(false)
        return
      }

      setSuccess('Registration completed successfully!')
      
      // Call onComplete callback to refresh member data
      if (onComplete) {
        setTimeout(() => {
          onComplete()
        }, 1500)
      }
    } catch (err) {
      console.error('Error submitting registration:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="card shadow-sm border-0" style={{ borderRadius: '16px' }}>
      <div className="card-body p-4 p-md-5">
        <div className="mb-4">
          <h3 className="mb-2">SPAN Registration</h3>
          <p className="text-muted">
            You've been selected to join Students for Patient Advocacy Nationwide, a student-led movement 
            dedicated to advancing healthcare equity through policy, education, and collaboration.
          </p>
          <p className="text-muted mb-0">
            Please complete this registration form to help us onboard you smoothly and build a complete member profile. 
            This form will collect basic contact information, role preferences, and important background details so we 
            can match you to the right team and opportunities.
          </p>
          <p className="text-muted mt-2 mb-0">
            If you have any questions while filling this out, feel free to reach out to Ben Kurian at (614) 588-5400.
          </p>
          <p className="text-primary fw-bold mt-2 mb-0">Welcome aboard — we're excited to work with you!</p>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success" role="alert">
            <i className="bi bi-check-circle-fill me-2"></i>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="d-flex flex-column gap-3">
            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="form-label">
                First Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className="form-label">
                Last Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>

            {/* Position */}
            <div>
              <label htmlFor="position" className="form-label">
                Position {formData.position && <small className="text-muted">(if we didn't tell you, leave this blank)</small>}
              </label>
              <input
                type="text"
                className="form-control"
                id="position"
                name="position"
                value={formData.position}
                onChange={handleChange}
                placeholder="Leave blank if not specified"
              />
            </div>

            {/* SPAN Email */}
            <div>
              <label htmlFor="email" className="form-label">
                SPAN Email <span className="text-danger">*</span>
              </label>
              <input
                type="email"
                className="form-control"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            {/* Phone Number */}
            <div>
              <label htmlFor="phone" className="form-label">
                Phone Number <span className="text-danger">*</span>
              </label>
              <input
                type="tel"
                className="form-control"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="(123) 456-7890"
                required
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label htmlFor="dob" className="form-label">
                Date of Birth <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                className="form-control"
                id="dob"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                required
              />
            </div>

            {/* School */}
            <div>
              <label htmlFor="school" className="form-label">
                School <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                id="school"
                name="school"
                value={formData.school}
                onChange={handleChange}
                required
              />
            </div>

            {/* City */}
            <div>
              <label htmlFor="city" className="form-label">
                City <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
              />
            </div>

            {/* State */}
            <div>
              <label htmlFor="state" className="form-label">
                State (abbreviation, e.g., OH, TX) <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                id="state"
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="OH"
                maxLength="2"
                style={{ textTransform: 'uppercase' }}
                required
                onInput={(e) => {
                  e.target.value = e.target.value.toUpperCase().slice(0, 2)
                }}
              />
            </div>

            {/* Profile Photo Upload */}
            <div>
              <label htmlFor="profileImage" className="form-label">
                Upload a square photo of yourself (shoulders and above only) <span className="text-danger">*</span>
              </label>
              <div className="mb-2">
                <small className="text-muted d-block mb-2">
                  • Use a plain or neutral background<br />
                  • Face the camera directly with good lighting<br />
                  • Make sure the image is clear and high resolution
                </small>
                <small className="text-muted">Max 10 MB. Supported formats: JPG, PNG, etc.</small>
              </div>
              <input
                type="file"
                className="form-control"
                id="profileImage"
                name="profileImage"
                accept="image/*"
                onChange={handleImageChange}
                required={!member?.image}
              />
              {profileImagePreview && (
                <div className="mt-3">
                  <img
                    src={profileImagePreview}
                    alt="Profile preview"
                    style={{
                      width: '150px',
                      height: '150px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      border: '2px solid #dee2e6'
                    }}
                  />
                </div>
              )}
            </div>

            {/* LinkedIn */}
            <div>
              <label htmlFor="linkedin" className="form-label">LinkedIn</label>
              <input
                type="url"
                className="form-control"
                id="linkedin"
                name="linkedin"
                value={formData.linkedin}
                onChange={handleChange}
                placeholder="https://linkedin.com/in/username"
              />
            </div>

            {/* Instagram */}
            <div>
              <label htmlFor="instagram" className="form-label">Instagram</label>
              <input
                type="text"
                className="form-control"
                id="instagram"
                name="instagram"
                value={formData.instagram}
                onChange={handleChange}
                placeholder="@username"
              />
            </div>

            {/* Additional Info */}
            <div>
              <label htmlFor="additionalInfo" className="form-label">
                Is there any additional info you'd like us to know?
              </label>
              <textarea
                className="form-control"
                id="additionalInfo"
                name="additionalInfo"
                rows="4"
                value={formData.additionalInfo}
                onChange={handleChange}
                placeholder="Optional: Tell us anything else you'd like us to know..."
              />
            </div>

            {/* Submit Button */}
            <div className="mt-2">
              <button
                type="submit"
                className="btn btn-dark btn-lg w-100"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle-fill me-2"></i>
                    Complete Registration
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RegistrationForm

