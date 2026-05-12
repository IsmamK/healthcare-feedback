from django.core.management.base import BaseCommand
from api.models import Doctor  # Replace 'yourapp' with your app name

class Command(BaseCommand):
    help = 'Prepopulate database with JG Healthcare doctors'

    def handle(self, *args, **kwargs):
        doctors_data = [
            # Medicine, Hormone & Diabetology
            {"name": "Brig. Gen. Prof. Dr. Md. Mizanur Rahman Khan", "specialization": "Medicine, Hormone & Diabetology", "qualifications": "MBBS (DMC), MPH (DU), MPhil (PG Hospital), FCGP, PhD Fellow (BUP)", "chamber_time": "Saturday–Thursday, 5:30 PM - 7:00 PM", "fee": "700 BDT", "order": 1},
            {"name": "Dr. Rinki Kundu", "specialization": "Medicine Specialist", "qualifications": "MBBS (DU), FCPS (Medicine), CCD (BIRDEM)", "chamber_time": "Everyday, 6:00 PM - 8:00 PM", "fee": "700 BDT", "order": 2},
            {"name": "Dr. Md. Mahfuzur Rahman", "specialization": "Medicine and Neuromedicine", "qualifications": "MBBS, MRCP (UK), MRCP (Edin), MACP (USA)", "chamber_time": "Saturday–Thursday, 5:30 PM - 8:00 PM", "fee": "1000 BDT", "order": 3},
            {"name": "Lt. Col. Dr. Md. Mainul Hasan Chowdhury", "specialization": "Medicine Specialist", "qualifications": "MBBS, MD (Internal Medicine)", "chamber_time": "Everyday, 7:00 PM - 9:00 PM", "fee": "700 BDT", "order": 4},
            {"name": "Lt. Col. Dr. Kaisar Jahan", "specialization": "Medicine Specialist", "qualifications": "MBBS, FCPS (Medicine)", "chamber_time": "Saturday, Monday & Wednesday, 5:00 PM - 7:00 PM", "fee": "700 BDT", "order": 5},
            {"name": "Major Dr. Hafez Mohammad Nizam Uddin", "specialization": "Medicine Specialist", "qualifications": "MBBS, FCPS (Medicine), MCPS, MACP (USA), MRCP (UK)", "chamber_time": "Saturday–Thursday, 8:00 PM - 10:00 PM", "fee": "700 BDT", "order": 6},
            {"name": "Lt. Col. Dr. Md. Sahidul Islam (Retd.)", "specialization": "Medicine Specialist", "qualifications": "MBBS, FCPS-II (Medicine)", "chamber_time": "Monday, Tuesday & Wednesday, 10:00 AM - 11:00 AM", "fee": "700 BDT", "order": 7},
            
            # Cardiology
            {"name": "Dr. Ayesha Siddika", "specialization": "Medicine and Cardiology", "qualifications": "MBBS (Gold Medalist), FCPS (Medicine), FCPS (Cardiology), FACP (USA)", "chamber_time": "Everyday, 8:30 PM - 10:00 PM", "fee": "700 BDT", "order": 8},
            {"name": "Major Dr. Md. Noornabi Khondokar", "specialization": "Medicine and Cardiology", "qualifications": "MBBS (DU), MD (Cardiology)", "chamber_time": "Sunday, Monday, Tuesday, Thursday & Friday, 4:00 PM - 6:00 PM", "fee": "1000 BDT", "order": 9},
            
            # Rheumatology
            {"name": "Dr. Md. Kafil Uddin Chowdhury", "specialization": "Medicine and Rheumatology", "qualifications": "MBBS, BCS (Health), FCPS (Medicine), FCPS (Rheumatology)", "chamber_time": "Sunday, Tuesday & Wednesday, 4:00 PM - 5:30 PM", "fee": "700 BDT", "order": 10},
            
            # Nephrology
            {"name": "Prof. Brig. Gen. Dr. Md. Maksudur Rasul", "specialization": "Medicine and Nephrology", "qualifications": "MBBS, MCPS (Medicine), FCPS (Internal Medicine), FCPS (Nephrology)", "chamber_time": "Saturday–Thursday, 4:30 PM - 6:30 PM", "fee": "1000 BDT", "order": 11},
            {"name": "Dr. Jubaida Khanam Chowdhury", "specialization": "Medicine and Nephrology", "qualifications": "MBBS, MD (Nephrology), CCD (BIRDEM)", "chamber_time": "Saturday–Thursday, 3:00 PM - 5:00 PM", "fee": "700 BDT", "order": 12},
            
            # Chest Diseases
            {"name": "Associate Professor Dr. Md. Shafiul Islam", "specialization": "Medicine and Chest Diseases", "qualifications": "MBBS (DMC), BCS (Health), FCPS (Medicine), FCPS (Pulmonology), FCCP (America)", "chamber_time": "Sunday, Tuesday & Thursday, 4:00 PM - 6:00 PM", "fee": "1000 BDT", "order": 13},
            {"name": "Dr. Abdullah Al Masud", "specialization": "Medicine and Chest Diseases", "qualifications": "MBBS (DMC), BCS (Health), MD (PG Hospital)", "chamber_time": "Sunday, Monday, Tuesday, Thursday & Friday, 7:00 PM - 9:00 PM", "fee": "700 BDT", "order": 14},
            
            # Physical Medicine
            {"name": "Dr. Saleh Ahmed (Shawon)", "specialization": "Physical Medicine", "qualifications": "MBBS, MD (Physical Medicine)", "chamber_time": "Sunday, Tuesday & Wednesday, 9:00 PM - 10:00 PM", "fee": "1000 BDT", "order": 15},
            
            # Gastroenterology
            {"name": "Major Dr. Md. Soleman Badsha", "specialization": "Medicine, Gastroenterology & Hepatology", "qualifications": "MBBS (AFMC), FCPS (Gastroenterology)", "chamber_time": "Friday, Saturday, Monday, Tuesday & Wednesday, 4:00 PM - 8:00 PM", "fee": "700 BDT", "order": 16},
            {"name": "Major Dr. Md. Zahidul Islam", "specialization": "Medicine, Gastroenterology & Hepatology", "qualifications": "MBBS, FCPS (Medicine), FCPS-Thesis (Gastroenterology)", "chamber_time": "Everyday, 7:00 PM - 9:00 PM", "fee": "700 BDT", "order": 17},
            
            # Neurosurgery
            {"name": "Prof. Dr. Col. Md. Amir Ali", "specialization": "Neurosurgery", "qualifications": "MBBS (Dhaka), FCPS (Neurosurgery)", "chamber_time": "Everyday, 8:00 PM - 10:00 PM", "fee": "1000 BDT", "order": 18},
            
            # Oncology
            {"name": "Prof. Dr. Islam Uddin Chowdhury", "specialization": "Oncology", "qualifications": "MBBS, PhD (Medical Oncology)", "chamber_time": "Saturday-Wednesday, 4:00 PM - 5:00 PM", "fee": "1000 BDT", "order": 19},
            {"name": "Dr. Mohammad Ashraf-Uz-Zaman Mahmud", "specialization": "Oncology", "qualifications": "MBBS, FCPS (Radiotherapy)", "chamber_time": "Saturday, Monday, and Wednesday, 2:30 PM - 4:00 PM", "fee": "1000 BDT", "order": 20},
            
            # Orthopedic
            {"name": "Prof. Dr. Col. Md. Abdul Kader (BSP)", "specialization": "Orthopedic Surgery", "qualifications": "MBBS (Dhaka), MS (Ortho Surgery), FACS (America)", "chamber_time": "Saturday–Thursday, 7:30 PM - 8:30 PM", "fee": "1000 BDT", "order": 21},
            {"name": "Lt. Col. Dr. Sumon Kumar Sen", "specialization": "Orthopedic Surgery", "qualifications": "MBBS (Dhaka), MS (Orthopedics)", "chamber_time": "Everyday, 8:30 PM - 9:30 PM", "fee": "1000 BDT", "order": 22},
            {"name": "Dr. Md. Abu Abdullah Hossain Mazumder", "specialization": "Orthopedic Surgery", "qualifications": "MBBS, BCS (Health), MS (Ortho Surgery)", "chamber_time": "Saturday, Monday & Wednesday, 5:30 PM - 7:00 PM", "fee": "800 BDT", "order": 23},
            {"name": "Major Dr. Faisal Ahmed Siddiquee", "specialization": "Orthopedic Surgery", "qualifications": "MBBS, MS (Orthopedics)", "chamber_time": "Everyday, 5:00 PM - 7:00 PM", "fee": "700 BDT", "order": 24},
            
            # Dermatology
            {"name": "Brig. Gen. Prof. Dr. Shamsul Huda (Retd.)", "specialization": "Dermatology, Venereology & Allergy", "qualifications": "MBBS, DDV, FCPS (Dermatology & Venereology)", "chamber_time": "Saturday–Thursday, 10:00 AM - 12:00 PM", "fee": "1000 BDT", "order": 25},
            {"name": "Prof. Col. Dr. Md. Mafizul Islam Khan Shamim", "specialization": "Dermatology, Venereology & Allergy", "qualifications": "MBBS, DDV, FCPS (Skin & VD)", "chamber_time": "Sunday, Tuesday, Thursday, 7:00 PM - 8:00 PM", "fee": "1000 BDT", "order": 26},
            {"name": "Lt. Col. Dr. Saiful Islam (Retd.)", "specialization": "Dermatology, Venereology & Allergy", "qualifications": "MBBS, MPH (PHA), DDV", "chamber_time": "Saturday, Monday & Wednesday, 10:00 AM - 12:00 PM & 5:00 PM - 7:00 PM", "fee": "700 BDT", "order": 27},
            {"name": "Dr. Fariza Adnan Upama", "specialization": "Dermatology, Venereology & Allergy", "qualifications": "MBBS, DDV, MCPS, FCPS (Final Part)", "chamber_time": "Sunday, Tuesday & Thursday, 6:00 PM - 8:00 PM", "fee": "800 BDT", "order": 28},
            {"name": "Dr. Sabrina Jabeen", "specialization": "Dermatology, Venereology & Allergy", "qualifications": "MBBS, DDV (Skin & VD)", "chamber_time": "Saturday, Sunday, Monday, Wednesday & Thursday, 7:30 PM - 9:00 PM", "fee": "700 BDT", "order": 29},
            
            # Pediatrics
            {"name": "Prof. (Brig. Gen.) Dr. Sabina Yeasmin", "specialization": "Neonatal & Child Diseases", "qualifications": "MBBS, DCH, FCPS (Pediatrics), MD (Neonatology)", "chamber_time": "Saturday-Wednesday, 5:30 PM - 7:00 PM", "fee": "700 BDT", "order": 30},
            {"name": "Brig. Gen. Prof. Dr. Khaleda Akhter (Retd.)", "specialization": "Neonatal & Child Diseases", "qualifications": "MBBS, DCH, FCPS (Pediatrics)", "chamber_time": "Saturday, Monday & Wednesday, 10:00 AM - 11:00 AM", "fee": "800 BDT", "order": 31},
            {"name": "Professor Dr. Zakia Nahar", "specialization": "Neonatal & Child Diseases", "qualifications": "MBBS, MD (Neonatology)", "chamber_time": "Saturday-Thursday, 7:00 PM - 9:00 PM", "fee": "1000 BDT", "order": 32},
            {"name": "Dr. Badrun Nessa", "specialization": "Neonatal & Child Diseases", "qualifications": "MBBS, DCH (Pediatrics)", "chamber_time": "Saturday, Monday & Thursday, 7:30 PM - 9:00 PM", "fee": "700 BDT", "order": 33},
            {"name": "Dr. Minhajul Islam", "specialization": "Neonatal & Child Diseases", "qualifications": "MBBS, BCS (Health), DCH (Pediatrics)", "chamber_time": "Everyday, 4:00 PM - 7:00 PM", "fee": "700 BDT", "order": 34},
            {"name": "Dr. M. A. Baki", "specialization": "Neonatal & Child Diseases", "qualifications": "MBBS, MD (Neonatology)", "chamber_time": "Saturday-Wednesday, 7:00 PM - 10:00 PM", "fee": "700 BDT", "order": 35},
            
            # Child Neurology
            {"name": "Dr. Husnea Ara Khan", "specialization": "Child Neurology", "qualifications": "MBBS, FCPS (Pediatrics), FCPS (Pediatric Neurology & Development)", "chamber_time": "Saturday-Wednesday, 5:00 PM - 7:00 PM", "fee": "1000 BDT", "order": 36},
            
            # Pediatric Cardiology
            {"name": "Major Dr. Ishrat Tanjin", "specialization": "Pediatric Cardiology", "qualifications": "MBBS, DCH, MCPS (Pediatrics), FCPS (Pediatric Cardiology)", "chamber_time": "Monday-Friday, 4:00 PM - 5:00 PM", "fee": "700 BDT", "order": 37},
            
            # Pediatric Surgery
            {"name": "Dr. Refoyez Mahmud", "specialization": "Pediatric Surgery", "qualifications": "MBBS (MMC), MS (Pediatric Surgery), MRCS (UK)", "chamber_time": "Daily, 6:00 PM - 8:00 PM", "fee": "800 BDT", "order": 38},
            
            # Urology
            {"name": "Dr. AKM Sirajul Islam", "specialization": "Urology", "qualifications": "MBBS (AFMC), BCS (Health), FCPS-II (Surgery), MS (Urology)", "chamber_time": "Saturday, Monday & Wednesday, 6:00 PM - 8:00 PM", "fee": "700 BDT", "order": 39},
            {"name": "Dr. Md. Ali Ashraf", "specialization": "Urology", "qualifications": "MBBS, BCS (Health), MS (Urology), FCPS (Surgery-Final Part)", "chamber_time": "Monday & Wednesday, 4:00 PM - 6:00 PM", "fee": "700 BDT", "order": 40},
            
            # Cardiovascular Surgery
            {"name": "Dr. M. A. Zaman", "specialization": "Cardiovascular & Thoracic Surgery", "qualifications": "MBBS (DU), MS (CVTS-PG Hospital)", "chamber_time": "Sunday, Monday & Wednesday, 7:30 PM - 9:00 PM", "fee": "1000 BDT", "order": 41},
            
            # Gynecology
            {"name": "Brig. Gen. Prof. Dr. Shahnaz Akter", "specialization": "Gynecology, Obstetrics & Infertility", "qualifications": "MBBS, DGO, FCPS (Gynae & Obs)", "chamber_time": "Everyday, 7:00 PM - 9:00 PM", "fee": "700 BDT", "order": 42},
            {"name": "Prof. Dr. Mahbuba Akhter", "specialization": "Gynecology, Obstetrics & Infertility", "qualifications": "MBBS (DU), FCPS (Gynae & Obs)", "chamber_time": "Saturday, Monday & Wednesday, 5:00 PM - 6:30 PM", "fee": "800 BDT", "order": 43},
            {"name": "Dr. Mowsumi Jahan (Retd.)", "specialization": "Gynecology, Obstetrics & Infertility", "qualifications": "MBBS, FCPS (Gynae & Obs), CCD (BIRDEM)", "chamber_time": "Saturday, Monday & Wednesday, 9:00 PM - 10:00 PM", "fee": "700 BDT", "order": 44},
            {"name": "Dr. Umme Sultana Jesmin", "specialization": "Gynecology, Obstetrics & Infertility", "qualifications": "MBBS, BCS (Health), FCPS (Obs & Gynae)", "chamber_time": "Friday, 10:00 AM - 12:00 PM & 5:00 PM - 8:00 PM", "fee": "700 BDT", "order": 45},
            
            # ENT
            {"name": "Lt. Col. Dr. Md. Shahadutth Ullah", "specialization": "ENT", "qualifications": "MBBS, DLO, FCPS (ENT), FACS (USA)", "chamber_time": "Sunday-Thursday, 5:30 PM - 7:00 PM", "fee": "1000 BDT", "order": 46},
            {"name": "Major Dr. Sylvia Akhter", "specialization": "ENT", "qualifications": "MBBS (AFMC), DLO, MCPS (ENT), FCPS (ENT & Head-Neck Surgery)", "chamber_time": "Everyday, 7:00 PM - 9:00 PM", "fee": "700 BDT", "order": 47},
            
            # Psychiatry
            {"name": "Dr. Noor-E-Haque Mishkat Jahan", "specialization": "Psychiatry", "qualifications": "MBBS (DU), BCS (Health), MD (Psychiatry)", "chamber_time": "Saturday-Thursday, 2:30 PM - 3:30 PM", "fee": "1000 BDT", "order": 48},
            
            # General Surgery
            {"name": "Brig. Gen. Prof. Dr. Md. Mahabub", "specialization": "General Surgery", "qualifications": "MBBS, FCPS (Surgery)", "chamber_time": "Everyday, 5:00 PM - 9:00 PM", "fee": "1000 BDT", "order": 49},
            {"name": "Dr. Md. Golam Masum", "specialization": "General Surgery", "qualifications": "MBBS (DU), FCPS (Surgery)", "chamber_time": "Everyday, 4:00 PM - 7:00 PM", "fee": "700 BDT", "order": 50},
            {"name": "Lt. Col. Dr. Md. Rakibul Huda", "specialization": "General Surgery", "qualifications": "MBBS (AFMC), FCPS (Surgery), MRCS (England), FACS (USA)", "chamber_time": "Sunday-Thursday, 5:00 PM - 9:00 PM", "fee": "1000 BDT", "order": 51},
            {"name": "Dr. Rawnak Jahan Kabir", "specialization": "General Surgery", "qualifications": "MBBS, FCPS (Surgery), MRCS (UK)", "chamber_time": "Saturday, Sunday, Tuesday & Wednesday, 6:00 PM - 8:00 PM", "fee": "700 BDT", "order": 52},
            
            # Dental
            {"name": "Dr. Rashed Md. Golam Rabbani", "specialization": "Orthodontics", "qualifications": "BDS, BCS (Health), FCPS", "chamber_time": "Please call for appointment", "fee": "", "order": 53},
            {"name": "Dr. Jannatul Ferdous (Mimi)", "specialization": "Prosthodontics", "qualifications": "MS (Prosthodontics), BDS, BCS (Health)", "chamber_time": "Monday, Tuesday & Friday, 4:00 PM - 8:00 PM", "fee": "", "order": 54},
            {"name": "Dr. Sharmin Akter", "specialization": "Orthodontics", "qualifications": "BDS (RU), PGT (Orthodontist)", "chamber_time": "Saturday, Sunday & Wednesday: 4:00 PM - 9:00 PM, Monday & Thursday: 10:00 AM - 2:00 PM", "fee": "", "order": 55},
            {"name": "Dr. Samina Nusrat", "specialization": "Conservative Dentistry", "qualifications": "BDS (DU), PGT (Conservative Dentistry)", "chamber_time": "Saturday, Sunday, Tuesday & Wednesday: 10:00 AM - 2:00 PM, Thursday: 4:00 PM - 9:00 PM", "fee": "", "order": 56},
            
            # Nutrition
            {"name": "Dr. Nargis Fatema", "specialization": "Nutritionist & Dietitian", "qualifications": "MBBS, MD, MPhil (Food and Nutrition)", "chamber_time": "Tuesday, Wednesday & Thursday, 3:00 PM - 4:00 PM", "fee": "1000 BDT", "order": 57},
            {"name": "Samsun Nahar Smriti", "specialization": "Nutritionist & Dietitian", "qualifications": "MPhil (Applied Nutrition), MSc-Food & Nutritional Science", "chamber_time": "Monday & Wednesday, 8:00 PM - 9:30 PM", "fee": "1000 BDT", "order": 58},
            
            # Physiotherapy
            {"name": "Md. Moniruzzaman", "specialization": "Physiotherapy", "qualifications": "Bachelor of Physiotherapy - DU, MPH", "chamber_time": "Saturday, 5:00 PM - 7:00 PM", "fee": "", "order": 59},
            {"name": "Priya Rani Mondal", "specialization": "Physiotherapy", "qualifications": "DPT, FT (Dhaka Medical College Hospital)", "chamber_time": "Saturday-Thursday, 9 AM - 9 PM", "fee": "", "order": 60},
            
            # Sonology
            {"name": "Dr. Suzana Haque Chowdhury", "specialization": "Sonology", "qualifications": "MBBS (DU), MPH (NIPSOM), DMU", "chamber_time": "Everyday, 3:00 PM - 5:00 PM", "fee": "", "order": 61},
            {"name": "Dr. Masuda Nazneen Rokeya", "specialization": "Sonology", "qualifications": "MBBS (DU), DMU (Ultra)", "chamber_time": "Saturday-Thursday, 9:30 AM - 2:00 PM", "fee": "", "order": 62},
            {"name": "Dr. Tohura Binte Amin", "specialization": "Sonology", "qualifications": "MBBS (DU), CMU (Ultra), DMU, PGT (Radiology)", "chamber_time": "Saturday–Thursday: 5:00 PM - 10:00 PM, Friday: 9:00 AM - 1:00 PM & 5:00 PM - 6:00 PM", "fee": "", "order": 63},
        ]
        
        created_count = 0
        for doctor_data in doctors_data:
            obj, created = Doctor.objects.get_or_create(
                name=doctor_data["name"],
                defaults=doctor_data
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'Created: {doctor_data["name"]}'))
        
        self.stdout.write(self.style.SUCCESS(f'Successfully added {created_count} new doctors. Total: {Doctor.objects.count()} doctors.'))