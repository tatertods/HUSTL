-- Sample tasks so the feed is not empty during the demo.
-- Run this AFTER you have signed in once on the live site (it needs one profile to own the rows).
-- They are marked is_sample, so even their owner can request them for testing.
insert into tasks (poster_id, poster_name, title, description, category, location, deadline, pay, is_sample)
select p.id, v.poster_name, v.title, v.description, v.category, v.location, v.deadline, v.pay, true
from (select id from profiles order by created_at limit 1) p,
(values
  ('Samuel Flynn', 'Back massage after a brutal midterm week', 'Twenty to thirty minutes, shoulders and upper back. I just need someone with decent hands and a calm playlist.', 'odd', 'Teter Quad', 'Tonight, 9:00 PM', 20),
  ('SPT', 'Deep clean the bottoms of my white sneakers', 'Three pairs, soles and midsoles only. Brushes and cleaner are provided, you bring the patience.', 'odd', 'Foster Quad', 'Tomorrow, 12:00 PM', 12),
  ('Maddie P', 'Open my window, it is painted shut', 'Old Briscoe window that will not budge and it is stuffy. Bring a putty knife or a bit of muscle.', 'odd', 'Briscoe Quad', 'Today, 6:00 PM', 7),
  ('Connor Ellis', 'Hold my spot in the student section line', 'Soccer match under the lights. Show up two hours early, I will take over at the gate.', 'odd', 'Bill Armstrong Stadium', 'Fri, 5:00 PM', 14),
  ('Nina Okafor', 'Walk my golden retriever between classes', 'Thirty minutes around Dunn Meadow. She loves squirrels and hates leashes, so patience helps.', 'errands', 'Dunn Meadow', 'Today, 2:00 PM', 14),
  ('Luca Moretti', 'Wash, dry and fold one load of laundry', 'Everything is already in a bag by my door. Warm wash, low dry, folded neatly.', 'errands', 'Eigenmann Hall', 'Tomorrow, 5:00 PM', 17),
  ('Grace Lin', 'Teach me to cook one real dinner', 'I can boil pasta and that is it. Looking for a patient cook to run one meal start to finish.', 'tutoring', 'Forest Quad kitchen', 'Sun, 5:30 PM', 25),
  ('Ethan Walsh', 'Proofread my six page econ paper tonight', 'Looking for clarity, flow and anything that sounds off. Comments in Google Docs are perfect.', 'tutoring', 'Wells Library', 'Tonight, 10:00 PM', 16),
  ('Ava Thompson', 'Film my 30 second pitch for entrepreneurship', 'Phone on a tripod, two or three takes, and a quick trim. I need an honest second opinion on delivery too.', 'odd', 'Kelley School of Business', 'Thu, 4:00 PM', 15),
  ('Kai Nakamura', 'Fix a flat and tune my bike brakes', 'Back tire is flat and the front brake rubs. I have the tube and a pump, you have the know how.', 'odd', 'Forest Quad bike racks', 'Sat, 11:00 AM', 18),
  ('Riley Chen', 'Pick up a birthday cake from a downtown bakery', 'Pre-ordered and paid for. Keep it flat, keep it cold, and get it to the SRSC lobby by 6.', 'pickup', 'Downtown Bloomington', 'Sat, 5:45 PM', 12),
  ('Formal committee', 'Take group photos at our formal by the Sample Gates', 'Forty minutes of golden hour group shots. Bring your phone or a camera, I will send a shot list.', 'odd', 'Sample Gates', 'Sat, 5:00 PM', 25),
  ('Aiden Brooks', 'Pick up my Amazon package at Wright Quad', 'Package is waiting at the Wright Quad mailroom. Bring your IU ID. Drop it at my door in Teter, 3rd floor.', 'pickup', 'Wright Quad', 'Today, 5:00 PM', 15),
  ('Priya Nair', 'Grocery run from Kroger on 3rd Street', 'About ten items, mostly produce and snacks. I will send the list in chat and you keep the receipt.', 'errands', 'Kroger, 3rd St', 'Today, 7:30 PM', 18),
  ('Jordan Kim', 'Help carry boxes into Briscoe Quad', 'Two flights of stairs, roughly twelve boxes and a mini fridge. Bring a friend if you want to split it.', 'movein', 'Briscoe Quad', 'Sat, 10:00 AM', 25),
  ('Sofia Alvarez', 'Calc II review session before the exam', 'One hour on series and convergence tests. I have the practice exam, I just need someone who has taken it.', 'tutoring', 'Wells Library', 'Tomorrow, 6:00 PM', 20),
  ('Marcus Hall', 'Print and deliver a lab report to Kelley', 'Eight pages, single sided. Hand it to the front desk in the Business Building by 8:30 AM.', 'errands', 'Kelley School of Business', 'Tomorrow, 8:15 AM', 8),
  ('Elena Park', 'Drop off a return at the UPS Store on Kirkwood', 'Label is already printed and the box is sealed. Take a photo of the receipt when you drop it.', 'pickup', 'Kirkwood Ave', 'Today, 4:30 PM', 9),
  ('Tyler Wu', 'Python debugging help for an intro class', 'My loops keep breaking. Looking for someone patient who can walk through it with me for an hour.', 'tutoring', 'Luddy Hall', 'Thu, 7:00 PM', 22),
  ('Hannah Cole', 'Assemble a desk and a bookshelf', 'Both are flat packs with all tools included. Should take about ninety minutes with two people.', 'movein', 'Union Street Apartments', 'Sun, 2:00 PM', 24)
) as v(poster_name, title, description, category, location, deadline, pay);
