from django.core.management.base import BaseCommand
from api.models import Question

class Command(BaseCommand):
    help = 'Populates the database with initial questions'

    def handle(self, *args, **options):
        questions_data = [
            {
                'id_name': 'doctor-communication',
                'english_text': 'Did the doctor answer all your questions and explain the prescription clearly?',
                'bangla_text': 'ডাক্তার কি আপনার সব প্রশ্নের উত্তর দিয়েছেন এবং প্রেসক্রিপশন পরিষ্কারভাবে বুঝিয়েছেন?',
                'question_type': 'rating',
                'order': 1
            },
            {
                'id_name': 'lab-timing',
                'english_text': 'Did you receive your lab tests/reports on time and without difficulty?',
                'bangla_text': 'আপনি কি আপনার ল্যাব টেস্ট/রিপোর্ট সময়মতো এবং কোন অসুবিধা ছাড়াই পেয়েছেন?',
                'question_type': 'rating',
                'order': 2
            },
            {
                'id_name': 'pharmacy-issues',
                'english_text': 'Did you face any problems while collecting medicines from our pharmacy?',
                'bangla_text': 'আমাদের ফার্মেসি থেকে ওষুধ সংগ্রহের সময় কি কোনো সমস্যার সম্মুখীন হয়েছেন?',
                'question_type': 'rating',
                'order': 3
            },
            {
                'id_name': 'pharmacy-value',
                'english_text': 'Are you satisfied with the price, availability of medicines, and the assistance of our staff?',
                'bangla_text': 'ওষুধের দাম, প্রাপ্যতা এবং আমাদের কর্মীদের সহায়তায় কি আপনি সন্তুষ্ট?',
                'question_type': 'rating',
                'order': 4
            },
            {
                'id_name': 'treatment-outcome',
                'english_text': 'How is your current physical condition after receiving the treatment?',
                'bangla_text': 'চিকিৎসা নেওয়ার পর আপনার বর্তমান শারীরিক অবস্থা কেমন?',
                'question_type': 'rating',
                'order': 5
            },
            {
                'id_name': 'staff-behavior',
                'english_text': 'Are you satisfied with the behavior of our staff, the reception, and the environment of the center?',
                'bangla_text': 'আমাদের কর্মীদের ব্যবহার, রিসেপশন এবং সেন্টারের পরিবেশে কি আপনি সন্তুষ্ট?',
                'question_type': 'rating',
                'order': 6
            },
            {
                'id_name': 'future-choice',
                'english_text': 'Would you like to choose JG Healthcare again for future services?',
                'bangla_text': 'আপনি কি ভবিষ্যতে আবারও JG Healthcare বেছে নিতে চান?',
                'question_type': 'rating',
                'order': 7
            },
            {
                'id_name': 'suggestions',
                'english_text': 'If you have any suggestions for improving our services, please let us know.',
                'bangla_text': 'আমাদের সেবা উন্নতির জন্য আপনার কোনো পরামর্শ থাকলে দয়া করে জানান।',
                'question_type': 'textarea',
                'order': 8
            },
            {
                'id_name': 'whatsapp',
                'english_text': 'Would you like to be added to our WhatsApp group?',
                'bangla_text': 'আপনি কি আমাদের WhatsApp গ্রুপে যুক্ত হতে চান?',
                'question_type': 'yesno',
                'order': 9
            },
        ]

        additional_questions_data = [
            {
                'id_name': 'issue-details',
                'english_text': 'Please tell us more about the issues you faced:',
                'bangla_text': 'দয়া করে আমাদের জানান আপনি কী কী সমস্যার সম্মুখীন হয়েছেন:',
                'question_type': 'textarea',
                'order': 10,
                'is_active': False  # These are only shown for low ratings
            },
            {
                'id_name': 'doctor-details',
                'english_text': 'Which doctor did you visit?',
                'bangla_text': 'আপনি কোন ডাক্তারের কাছে গিয়েছিলেন?',
                'question_type': 'textarea',
                'order': 11,
                'is_active': False
            },
            {
                'id_name': 'contact-consent',
                'english_text': 'Can we contact you to discuss these issues further?',
                'bangla_text': 'আমরা কি আপনাকে এই সমস্যাগুলি নিয়ে আরও আলোচনা করতে যোগাযোগ করতে পারি?',
                'question_type': 'textarea',
                'order': 12,
                'is_active': False
            }
        ]

        # Create main questions
        created_count = 0
        updated_count = 0
        
        for question_data in questions_data:
            question, created = Question.objects.update_or_create(
                id_name=question_data['id_name'],
                defaults={
                    'english_text': question_data['english_text'],
                    'bangla_text': question_data['bangla_text'],
                    'question_type': question_data['question_type'],
                    'order': question_data['order'],
                    'is_active': True
                }
            )
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created question: {question.id_name}')
                )
            else:
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'Updated question: {question.id_name}')
                )

        # Create additional questions (initially inactive)
        for question_data in additional_questions_data:
            question, created = Question.objects.update_or_create(
                id_name=question_data['id_name'],
                defaults={
                    'english_text': question_data['english_text'],
                    'bangla_text': question_data['bangla_text'],
                    'question_type': question_data['question_type'],
                    'order': question_data['order'],
                    'is_active': question_data['is_active']
                }
            )
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created additional question: {question.id_name}')
                )
            else:
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'Updated additional question: {question.id_name}')
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully populated questions. Created: {created_count}, Updated: {updated_count}'
            )
        )